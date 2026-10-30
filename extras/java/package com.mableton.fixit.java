package com.mableton.fixit.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Entity
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String senderName;
    private String message;
    private String timestamp;

    @PrePersist
    protected void onCreate() {
        this.timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("hh:mm a"));
    }

    // Getters and Setters
    public Long getId() { return id; }
    public String getSenderName() { return senderName; }
    public void setSenderName(String senderName) { this.senderName = senderName; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getTimestamp() { return timestamp; }
}
