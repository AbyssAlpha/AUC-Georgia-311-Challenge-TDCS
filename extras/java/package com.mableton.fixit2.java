package com.mableton.fixit.model;

import jakarta.persistence.*;

@Entity
@Table(name = "residents")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fullName;
    private String zipCode;
    private boolean isVerifiedResident;

    // Getters and Setters
    public Long getId() { return id; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getZipCode() { return zipCode; }
    public void setZipCode(String zipCode) { this.zipCode = zipCode; }
    public boolean isVerifiedResident() { return isVerifiedResident; }
    public void setVerifiedResident(boolean verifiedResident) { isVerifiedResident = verifiedResident; }
}
