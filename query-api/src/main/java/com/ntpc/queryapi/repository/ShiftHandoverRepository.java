package com.ntpc.queryapi.repository;

import com.ntpc.queryapi.entity.ShiftHandoverEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ShiftHandoverRepository extends JpaRepository<ShiftHandoverEntity, java.util.UUID> {
}
