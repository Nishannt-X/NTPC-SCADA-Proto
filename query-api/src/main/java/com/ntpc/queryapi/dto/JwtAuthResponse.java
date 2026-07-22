package com.ntpc.queryapi.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
public class JwtAuthResponse {
    private String accessToken;
    private String tokenType = "Bearer";
    private String username;
    private List<String> roles;
    private Boolean isOnShift;
    private Integer assignedShift;

    public JwtAuthResponse(String accessToken, String username, List<String> roles, Boolean isOnShift, Integer assignedShift) {
        this.accessToken = accessToken;
        this.username = username;
        this.roles = roles;
        this.isOnShift = isOnShift;
        this.assignedShift = assignedShift;
    }
}
