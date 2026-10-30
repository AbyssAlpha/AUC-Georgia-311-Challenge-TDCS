package com.mableton.fixit.controller;

import com.mableton.fixit.model.ChatMessage;
import com.mableton.fixit.model.User;
import com.mableton.fixit.repository.ChatMessageRepository;
import com.mableton.fixit.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
public class ChatController {

    @Autowired
    private ChatMessageRepository chatRepo;

    @Autowired
    private UserRepository userRepo;

    @MessageMapping("/sendMessage")
    @SendTo("/topic/messages")
    public ChatMessage broadcastMessage(ChatMessage message) {
        return chatRepo.save(message);
    }

    @PostMapping("/api/chat/verify")
    public ResponseEntity<?> verifyResident(@RequestBody Map<String, Object> payload) {
        String name = (String) payload.get("name");
        String zip = (String) payload.get("zip");
        Double lat = Double.parseDouble(payload.get("lat").toString());
        Double lng = Double.parseDouble(payload.get("lng").toString());

        boolean isInMableton = (lat >= 33.77 && lat <= 33.87) && (lng >= -84.63 && lng <= -84.52);
        boolean isValidZip = zip.equals("30126") || zip.equals("30168") || zip.equals("30082");

        if (isInMableton && isValidZip) {
            User user = new User();
            user.setFullName(name);
            user.setZipCode(zip);
            user.setVerifiedResident(true);
            userRepo.save(user);
            return ResponseEntity.ok(Map.of("verified", true, "name", name));
        }
        return ResponseEntity.badRequest().body("Resident check failed: Outside Mableton bounds.");
    }
}
