package org.charno.system.controller;

import org.charno.common.security.annotation.RequiresRole;
import org.charno.common.web.response.ApiResponse;
import org.charno.common.web.response.PageResult;
import org.charno.system.service.AdminTaxiReimbursementService;
import org.charno.systementity.entity.TaxiReimbursement;
import org.charno.systementity.repository.TaxiReimbursementRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * 打车报销管理控制器
 * 面向管理员的 CRUD 与条件查询接口
 */
@RequiresRole("ADMIN")
@RestController
@RequestMapping("/api/admin/taxi-reimbursements")
public class AdminTaxiReimbursementController {

    private final AdminTaxiReimbursementService adminTaxiReimbursementService;
    private final TaxiReimbursementRepository taxiReimbursementRepository;

    public AdminTaxiReimbursementController(AdminTaxiReimbursementService adminTaxiReimbursementService,
                                            TaxiReimbursementRepository taxiReimbursementRepository) {
        this.adminTaxiReimbursementService = adminTaxiReimbursementService;
        this.taxiReimbursementRepository = taxiReimbursementRepository;
    }

    // ==================== CRUD ====================

    /**
     * 创建报销记录
     */
    @PostMapping
    public Mono<ApiResponse<TaxiReimbursement>> create(@RequestBody TaxiReimbursement request) {
        return Mono.defer(() -> {
                    // 简单必填校验
                    if (request.getUserId() == null) {
                        return Mono.just(ApiResponse.<TaxiReimbursement>fail("用户ID不能为空"));
                    }
                    if (request.getReimburseDate() == null) {
                        return Mono.just(ApiResponse.<TaxiReimbursement>fail("报销日期不能为空"));
                    }
                    if (request.getDestination() == null || request.getDestination().isEmpty()) {
                        return Mono.just(ApiResponse.<TaxiReimbursement>fail("去哪里不能为空"));
                    }
                    if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
                        return Mono.just(ApiResponse.<TaxiReimbursement>fail("报销金额必须为正数"));
                    }
                    if (request.getPurpose() == null || request.getPurpose().isEmpty()) {
                        return Mono.just(ApiResponse.<TaxiReimbursement>fail("行程目的不能为空"));
                    }

                    // 主键使用数据库生成（保持与表定义一致），这里不主动设置 ID
                    OffsetDateTime now = OffsetDateTime.now();
                    request.setCreatedAt(now);
                    request.setUpdatedAt(now);

                    return taxiReimbursementRepository.save(request)
                            .map(ApiResponse::success);
                })
                .onErrorResume(e -> Mono.just(ApiResponse.<TaxiReimbursement>fail("创建报销记录失败：" + e.getMessage())));
    }

    /**
     * 根据ID查询报销记录
     */
    @GetMapping("/{id}")
    public Mono<ApiResponse<TaxiReimbursement>> getById(@PathVariable UUID id) {
        return taxiReimbursementRepository.findById(id)
                .map(ApiResponse::success)
                .switchIfEmpty(Mono.just(ApiResponse.<TaxiReimbursement>fail("报销记录不存在")))
                .onErrorResume(e -> Mono.just(ApiResponse.<TaxiReimbursement>fail("查询报销记录失败：" + e.getMessage())));
    }

    /**
     * 更新报销记录
     */
    @PutMapping("/{id}")
    public Mono<ApiResponse<TaxiReimbursement>> update(@PathVariable UUID id,
                                                       @RequestBody TaxiReimbursement request) {
        return taxiReimbursementRepository.findById(id)
                .flatMap(existing -> {
                    // 只更新允许修改的字段
                    if (request.getUserId() != null) {
                        existing.setUserId(request.getUserId());
                    }
                    if (request.getReimburseDate() != null) {
                        existing.setReimburseDate(request.getReimburseDate());
                    }
                    if (request.getDestination() != null) {
                        existing.setDestination(request.getDestination());
                    }
                    if (request.getAmount() != null) {
                        existing.setAmount(request.getAmount());
                    }
                    if (request.getPurpose() != null) {
                        existing.setPurpose(request.getPurpose());
                    }
                    if (request.getScreenshotUrl() != null) {
                        existing.setScreenshotUrl(request.getScreenshotUrl());
                    }
                    existing.setUpdatedAt(OffsetDateTime.now());

                    return taxiReimbursementRepository.save(existing)
                            .map(ApiResponse::success);
                })
                .switchIfEmpty(Mono.just(ApiResponse.<TaxiReimbursement>fail("报销记录不存在")))
                .onErrorResume(e -> Mono.just(ApiResponse.<TaxiReimbursement>fail("更新报销记录失败：" + e.getMessage())));
    }

    /**
     * 删除报销记录
     */
    @DeleteMapping("/{id}")
    public Mono<ApiResponse<Void>> delete(@PathVariable UUID id) {
        return taxiReimbursementRepository.findById(id)
                .flatMap(existing -> taxiReimbursementRepository.deleteById(id)
                        .then(Mono.just(ApiResponse.<Void>success())))
                .switchIfEmpty(Mono.just(ApiResponse.<Void>fail("报销记录不存在")))
                .onErrorResume(e -> Mono.just(ApiResponse.<Void>fail("删除报销记录失败：" + e.getMessage())));
    }

    // ==================== 条件查询 ====================

    /**
     * 按条件汇总报销金额
     */
    @GetMapping("/query/sum")
    public Mono<ApiResponse<java.math.BigDecimal>> sumAmount(
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String reimburseDate,
            @RequestParam(required = false) String reimburseDateFrom,
            @RequestParam(required = false) String reimburseDateTo,
            @RequestParam(required = false) String destination,
            @RequestParam(required = false) String purpose) {

        UUID userUuid = parseUuid(userId);
        LocalDate date = parseLocalDate(reimburseDate);
        LocalDate from = parseLocalDate(reimburseDateFrom);
        LocalDate to = parseLocalDate(reimburseDateTo);

        return adminTaxiReimbursementService.sumAmount(userUuid, date, from, to, destination, purpose)
                .map(ApiResponse::success)
                .onErrorResume(e -> Mono.just(ApiResponse.<java.math.BigDecimal>fail("汇总报销金额失败：" + e.getMessage())));
    }

    /**
     * 不分页条件查询
     */
    @GetMapping("/query")
    public Mono<ApiResponse<List<TaxiReimbursement>>> query(
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String reimburseDate,
            @RequestParam(required = false) String reimburseDateFrom,
            @RequestParam(required = false) String reimburseDateTo,
            @RequestParam(required = false) String destination,
            @RequestParam(required = false) String purpose) {

        UUID userUuid = parseUuid(userId);
        LocalDate date = parseLocalDate(reimburseDate);
        LocalDate from = parseLocalDate(reimburseDateFrom);
        LocalDate to = parseLocalDate(reimburseDateTo);

        return adminTaxiReimbursementService.query(userUuid, date, from, to, destination, purpose)
                .collectList()
                .map(ApiResponse::success)
                .onErrorResume(e -> Mono.just(ApiResponse.<java.util.List<TaxiReimbursement>>fail("查询报销记录失败：" + e.getMessage())));
    }

    /**
     * 分页条件查询
     */
    @GetMapping("/query/page")
    public Mono<ApiResponse<PageResult<TaxiReimbursement>>> queryWithPage(
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String reimburseDate,
            @RequestParam(required = false) String reimburseDateFrom,
            @RequestParam(required = false) String reimburseDateTo,
            @RequestParam(required = false) String destination,
            @RequestParam(required = false) String purpose,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String sort) {

        UUID userUuid = parseUuid(userId);
        LocalDate date = parseLocalDate(reimburseDate);
        LocalDate from = parseLocalDate(reimburseDateFrom);
        LocalDate to = parseLocalDate(reimburseDateTo);
        Pageable pageable = buildPageable(page, size, sort);

        return adminTaxiReimbursementService.queryWithPage(userUuid, date, from, to, destination, purpose, pageable)
                .map(ApiResponse::success)
                .onErrorResume(e -> Mono.just(ApiResponse.<PageResult<TaxiReimbursement>>fail("分页查询报销记录失败：" + e.getMessage())));
    }

    // ==================== 辅助方法 ====================

    private UUID parseUuid(String value) {
        if (value == null || value.isEmpty()) {
            return null;
        }
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private LocalDate parseLocalDate(String value) {
        if (value == null || value.isEmpty()) {
            return null;
        }
        try {
            return LocalDate.parse(value);
        } catch (Exception e) {
            return null;
        }
    }

    private Pageable buildPageable(int page, int size, String sort) {
        if (sort != null && !sort.isEmpty()) {
            String[] sortParts = sort.split(",");
            if (sortParts.length == 2) {
                String field = sortParts[0].trim();
                Sort.Direction direction = "desc".equalsIgnoreCase(sortParts[1].trim())
                        ? Sort.Direction.DESC
                        : Sort.Direction.ASC;
                return PageRequest.of(page, size, Sort.by(direction, field));
            }
        }
        // 默认按创建时间降序
        return PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "created_at"));
    }
}

