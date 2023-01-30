package com.ssafysignal.api.common.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class EmailDto {
    private String receiveAddress;
    private String host;
    private String title;
    private String text;
    private String url;

    public EmailDto(String receiveAddress, String host, String title, String text, String url) {
        this.receiveAddress = receiveAddress;
        this.host = host;
        this.title = title;
        this.text = text;
        this.url = url;
    }

}