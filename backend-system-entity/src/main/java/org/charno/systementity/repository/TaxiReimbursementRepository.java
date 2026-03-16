package org.charno.systementity.repository;

import org.charno.systementity.entity.TaxiReimbursement;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.data.repository.reactive.ReactiveSortingRepository;

import java.util.UUID;

/**
 * 打车报销 Repository
 * Spring Data R2DBC 响应式持久层接口
 */
public interface TaxiReimbursementRepository extends ReactiveCrudRepository<TaxiReimbursement, UUID>,
        ReactiveSortingRepository<TaxiReimbursement, UUID> {
}

