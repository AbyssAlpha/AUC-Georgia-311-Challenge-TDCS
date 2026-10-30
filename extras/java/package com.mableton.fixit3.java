package com.mableton.fixit.repository;

import com.mableton.fixit.model.IssueReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IssueReportRepository extends JpaRepository<IssueReport, Long> {
    Page<IssueReport> findAll(Pageable pageable);
}
