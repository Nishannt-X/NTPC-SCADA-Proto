package com.ntpc.queryapi.repository;

import com.ntpc.queryapi.entity.SharedSystemEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SharedSystemRepository extends JpaRepository<SharedSystemEntity, java.util.UUID> {
}
