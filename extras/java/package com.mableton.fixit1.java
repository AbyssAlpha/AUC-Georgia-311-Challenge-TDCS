package com.mableton.fixit.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class IssueReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String category;
    private String description;
    private Double latitude;
    private Double longitude;
    private String googleMapsUrl;

    @Lob
    @Column(columnDefinition = "CLOB")
    private String imageBase64;

    private String status;
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.status = "Open";
        if (this.latitude != null && this.longitude != null) {
            this.googleMapsUrl = "https://www.google.com/maps?q=" + this.latitude + "," + this.longitude;
        }
    }

    // Getters and Setters
    public Long getId() { return id; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public String getGoogleMapsUrl() { return googleMapsUrl; }
    public String getImageBase64() { return imageBase64; }
    public void setImageBase64(String imageBase64) { this.imageBase64 = imageBase64; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
