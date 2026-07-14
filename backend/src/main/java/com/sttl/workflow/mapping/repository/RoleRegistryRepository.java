package com.sttl.workflow.mapping.repository;

import com.sttl.workflow.mapping.entity.RoleRegistry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoleRegistryRepository extends JpaRepository<RoleRegistry, Long> {

    List<RoleRegistry> findAllByOrderByTypeAscLabelAsc();

    List<RoleRegistry> findBySource(String source);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM RoleRegistry r WHERE r.source = :source")
    void deleteBySource(@Param("source") String source);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM RoleRegistry r WHERE r.roleId = :roleId")
    void deleteByRoleId(@Param("roleId") String roleId);
}
