#version 440

layout(location = 0) in vec2 qt_TexCoord0;
layout(location = 0) out vec4 fragColor;

layout(std140, binding = 0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;
    float u_time;
    vec2 u_resolution;
    vec2 u_mouse;
    float u_filter;
};

layout(binding = 1) uniform sampler2D source;

#define PI 3.14159265359

float sphereIntersect(vec3 ro, vec3 rd, vec3 sphPos, float r) {
    vec3 oc = ro - sphPos;
    float b = dot(oc, rd);
    float c = dot(oc, oc) - r * r;
    float h = b * b - c;
    if (h < 0.0) return -1.0;
    return -b - sqrt(h);
}

float getAsciiChar(float n, vec2 p) {
    vec2 ip = floor(p * 4.0);
    if (ip.x < 0.0 || ip.x > 3.0 || ip.y < 0.0 || ip.y > 3.0) return 0.0;
    
    float c = 0.0;
    if (n > 0.75)      c = 65535.0; // Full solid square
    else if (n > 0.6)  c = 31599.0; // @
    else if (n > 0.45) c = 25196.0; // #
    else if (n > 0.3)  c = 2928.0;  // *
    else if (n > 0.15) c = 2056.0;  // +
    else               c = 34952.0; // Ocean fill

    float bitIndex = ip.x + ip.y * 4.0;
    return (mod(c, pow(2.0, bitIndex + 1.0)) >= pow(2.0, bitIndex)) ? 1.0 : 0.0;
}

float getStarChar(float typeVal, vec2 p) {
    vec2 ip = floor(p * 4.0);
    if (ip.x < 0.0 || ip.x > 3.0 || ip.y < 0.0 || ip.y > 3.0) return 0.0;
    
    float c = 512.0; // Dot (.)
    if (typeVal > 0.5) {
        c = 16384.0; // Apostrophe (')
    }
    
    float bitIndex = ip.x + ip.y * 4.0;
    return (mod(c, pow(2.0, bitIndex + 1.0)) >= pow(2.0, bitIndex)) ? 1.0 : 0.0;
}

vec3 applyColorFilter(vec3 color, float lum) {
    if (u_filter < 0.5) {
        return color;
    } else if (u_filter < 1.5) {
        return vec3(lum * 1.2, lum * 0.6, lum * 0.1);
    } else if (u_filter < 2.5) {
        return vec3(lum * 0.2, lum * 1.3, lum * 0.3);
    } else if (u_filter < 3.5) {
        return vec3(lum * 0.1, lum * 0.8, lum * 1.2);
    } else {
        return vec3(lum);
    }
}

void main() {
    vec2 cellSize = vec2(10.0, 16.0);
    
    vec2 cellCoord = floor(gl_FragCoord.xy / cellSize);
    vec2 localCoord = fract(gl_FragCoord.xy / cellSize);

    vec2 cellCenterCoord = (cellCoord * cellSize) + (cellSize * 0.5);
    vec2 uv = (cellCenterCoord - 0.5 * u_resolution.xy) / u_resolution.y;

    vec3 ro = vec3(0.0, 0.0, 4.0);
    vec3 rd = normalize(vec3(uv, -2.0));

    vec3 spherePos = vec3(0.0, -1.4, 0.0);
    float radius = 1.8;

    float t = sphereIntersect(ro, rd, spherePos, radius);

    if (t > 0.0) {
        vec3 hitPos = ro + t * rd;
        vec3 localPos = hitPos - spherePos;

        float yaw = u_time * 0.15 + u_mouse.x * 0.35;
        float pitch = u_mouse.y * 0.35;

        mat3 rotY = mat3(
            cos(yaw), 0.0, sin(yaw),
            0.0,      1.0, 0.0,
           -sin(yaw), 0.0, cos(yaw)
        );
        mat3 rotX = mat3(
            1.0, 0.0,       0.0,
            0.0, cos(pitch), -sin(pitch),
            0.0, sin(pitch),  cos(pitch)
        );

        mat3 totalRot = rotY * rotX;
        vec3 rotatedNorm = totalRot * normalize(localPos);

        float u = 0.5 - atan(rotatedNorm.z, rotatedNorm.x) / (2.0 * PI);
        float v = 0.5 - asin(rotatedNorm.y) / PI;
        vec2 texCoord = vec2(u, v);

        vec4 texColor = texture(source, texCoord);

        vec3 lightDir = normalize(vec3(0.7, 0.3, 1.0));
        float diff = max(dot(normalize(localPos), lightDir), 0.4);

        float rawLum = dot(texColor.rgb, vec3(0.25, 0.55, 0.2));
        float luminance = pow(rawLum * diff, 0.6); 
        luminance = clamp(luminance * 1.3 + 0.1, 0.0, 1.0);

        float asciiChar = getAsciiChar(luminance, localCoord);

        vec3 baseColor = texColor.rgb * diff * asciiChar;
        float baseLum = dot(baseColor, vec3(0.299, 0.587, 0.114));
        vec3 filteredColor = applyColorFilter(baseColor, baseLum * 1.5);

        fragColor = vec4(filteredColor, 1.0) * qt_Opacity;
    } else {
        vec2 seed = cellCoord + vec2(43.12, 17.68);
        float cellHash = fract(sin(dot(seed, vec2(12.9898, 78.233))) * 43758.5453);
        
        if (cellHash > 0.985) {
            float baseStarType = fract(cellHash * 73.12);
            
            float morphWave = sin(u_time * 0.4 + cellHash * 31.4);
            float dynamicStarType = fract(baseStarType + morphWave * 0.35);
            
            float starSpeed = 0.2 + fract(cellHash * 29.4) * 0.5;
            float starPhase = fract(cellHash * 137.5) * 6.28318;
            
            float lifecycle = sin(u_time * starSpeed + starPhase);
            float alpha = smoothstep(-0.2, 0.6, lifecycle);
            
            if (alpha > 0.05) {
                float starChar = getStarChar(dynamicStarType, localCoord);
                vec3 starColor = vec3(1.0) * starChar * alpha * 1.2;
                
                if (u_filter >= 0.5 && u_filter < 1.5) starColor *= vec3(1.2, 0.7, 0.2);
                else if (u_filter >= 1.5 && u_filter < 2.5) starColor *= vec3(0.3, 1.2, 0.4);
                else if (u_filter >= 2.5 && u_filter < 3.5) starColor *= vec3(0.2, 0.9, 1.2);
                
                fragColor = vec4(starColor, 1.0) * qt_Opacity;
            } else {
                fragColor = vec4(0.0, 0.0, 0.0, 1.0) * qt_Opacity;
            }
        } else {
            fragColor = vec4(0.0, 0.0, 0.0, 1.0) * qt_Opacity;
        }
    }
}
