package org.charno.system.service;

import org.charno.common.web.response.PageResult;
import org.charno.systementity.entity.TaxiReimbursement;
import org.springframework.data.domain.Pageable;
import org.springframework.data.r2dbc.core.R2dbcEntityTemplate;
import org.springframework.data.relational.core.query.Criteria;
import org.springframework.data.relational.core.query.Query;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * 打车报销管理业务服务
 * 提供不分页与分页条件查询能力
 */
@Service
public class AdminTaxiReimbursementService {

    private final R2dbcEntityTemplate template;

    public AdminTaxiReimbursementService(R2dbcEntityTemplate template) {
        this.template = template;
    }

    /**
     * 不分页条件查询打车报销记录
     *
     * @param userId         用户ID（可选）
     * @param reimburseDate  报销日期（可选）
     * @param reimburseDateFrom 报销日期范围起（可选，与 reimburseDateTo 同时传入时按范围筛选）
     * @param reimburseDateTo   报销日期范围止（可选）
     * @param destination    去哪里（可选，支持模糊查询）
     * @param purpose        行程目的（可选，支持模糊查询）
     * @return Flux<TaxiReimbursement> 列表
     */
    public Flux<TaxiReimbursement> query(UUID userId,
                                         LocalDate reimburseDate,
                                         LocalDate reimburseDateFrom,
                                         LocalDate reimburseDateTo,
                                         String destination,
                                         String purpose) {
        Criteria criteria = buildCriteria(userId, reimburseDate, reimburseDateFrom, reimburseDateTo, destination, purpose);
        return template.select(TaxiReimbursement.class)
                .matching(Query.query(criteria))
                .all();
    }

    /**
     * 兼容旧签名：不传范围时仍可调用
     */
    public Flux<TaxiReimbursement> query(UUID userId,
                                         LocalDate reimburseDate,
                                         String destination,
                                         String purpose) {
        return query(userId, reimburseDate, null, null, destination, purpose);
    }

    /**
     * 分页条件查询打车报销记录
     *
     * @param userId         用户ID（可选）
     * @param reimburseDate  报销日期（可选）
     * @param reimburseDateFrom 报销日期范围起（可选）
     * @param reimburseDateTo   报销日期范围止（可选）
     * @param destination    去哪里（可选，支持模糊查询）
     * @param purpose        行程目的（可选，支持模糊查询）
     * @param pageable       分页参数
     * @return Mono<PageResult<TaxiReimbursement>> 分页结果
     */
    public Mono<PageResult<TaxiReimbursement>> queryWithPage(UUID userId,
                                                             LocalDate reimburseDate,
                                                             LocalDate reimburseDateFrom,
                                                             LocalDate reimburseDateTo,
                                                             String destination,
                                                             String purpose,
                                                             Pageable pageable) {
        Criteria criteria = buildCriteria(userId, reimburseDate, reimburseDateFrom, reimburseDateTo, destination, purpose);
        Query baseQuery = Query.query(criteria);

        Mono<Long> countMono = template.count(baseQuery, TaxiReimbursement.class);

        Mono<java.util.List<TaxiReimbursement>> dataMono = template.select(TaxiReimbursement.class)
                .matching(baseQuery.with(pageable))
                .all()
                .collectList();

        return Mono.zip(countMono, dataMono)
                .map(tuple -> PageResult.<TaxiReimbursement>builder()
                        .data(tuple.getT2())
                        .total(tuple.getT1())
                        .page(pageable.getPageNumber())
                        .size(pageable.getPageSize())
                        .build());
    }

    /**
     * 兼容旧签名：不传范围时仍可调用
     */
    public Mono<PageResult<TaxiReimbursement>> queryWithPage(UUID userId,
                                                             LocalDate reimburseDate,
                                                             String destination,
                                                             String purpose,
                                                             Pageable pageable) {
        return queryWithPage(userId, reimburseDate, null, null, destination, purpose, pageable);
    }

    /**
     * 按条件汇总报销金额
     *
     * @return Mono<BigDecimal> 金额合计，无记录时为 0
     */
    public Mono<BigDecimal> sumAmount(UUID userId,
                                      LocalDate reimburseDate,
                                      LocalDate reimburseDateFrom,
                                      LocalDate reimburseDateTo,
                                      String destination,
                                      String purpose) {
        Criteria criteria = buildCriteria(userId, reimburseDate, reimburseDateFrom, reimburseDateTo, destination, purpose);
        return template.select(TaxiReimbursement.class)
                .matching(Query.query(criteria))
                .all()
                .map(tr -> tr.getAmount() != null ? tr.getAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * 构建查询条件
     */
    private Criteria buildCriteria(UUID userId,
                                   LocalDate reimburseDate,
                                   LocalDate reimburseDateFrom,
                                   LocalDate reimburseDateTo,
                                   String destination,
                                   String purpose) {
        Criteria criteria = Criteria.empty();

        if (userId != null) {
            criteria = criteria.and(Criteria.where("user_id").is(userId));
        }

        if (reimburseDateFrom != null && reimburseDateTo != null) {
            criteria = criteria.and(Criteria.where("reimburse_date").greaterThanOrEquals(reimburseDateFrom));
            criteria = criteria.and(Criteria.where("reimburse_date").lessThanOrEquals(reimburseDateTo));
        } else if (reimburseDate != null) {
            criteria = criteria.and(Criteria.where("reimburse_date").is(reimburseDate));
        }

        if (destination != null && !destination.isEmpty()) {
            criteria = criteria.and(Criteria.where("destination").like("%" + destination + "%"));
        }

        if (purpose != null && !purpose.isEmpty()) {
            criteria = criteria.and(Criteria.where("purpose").like("%" + purpose + "%"));
        }

        return criteria;
    }
}

