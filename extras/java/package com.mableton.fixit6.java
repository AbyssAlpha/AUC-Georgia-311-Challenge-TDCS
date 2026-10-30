package com.mableton.fixit.controller;

import com.mableton.fixit.model.IssueReport;
import com.mableton.fixit.repository.IssueReportRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = "*")
public class IssueReportController {

    @Autowired
    private IssueReportRepository repository;

    @PostMapping
    public ResponseEntity<IssueReport> createReport(@RequestBody IssueReport report) {
        return ResponseEntity.ok(repository.save(report));
    }

    @GetMapping
    public Page<IssueReport> getReports(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return repository.findAll(PageRequest.of(page, size, Sort.by("id").descending()));
    }
}
