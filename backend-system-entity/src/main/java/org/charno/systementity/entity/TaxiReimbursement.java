package org.charno.systementity.entity;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * 打车报销实体
 * 对应表 taxi_reimbursement
 */
@Getter
@Setter
@Table(name = "taxi_reimbursement")
public class TaxiReimbursement {

    /**
     * 报销记录唯一标识（UUID 主键）
     */
    @Id
    private UUID id;

    /**
     * 用户ID
     */
    @Column("user_id")
    private UUID userId;

    /**
     * 报销日期
     */
    @Column("reimburse_date")
    private LocalDate reimburseDate;

    /**
     * 去哪里
     */
    private String destination;

    /**
     * 报销金额
     */
    private BigDecimal amount;

    /**
     * 行程目的
     */
    private String purpose;

    /**
     * 截图地址
     */
    @Column("screenshot_url")
    private String screenshotUrl;

    /**
     * 创建时间
     */
    @Column("created_at")
    private OffsetDateTime createdAt;

    /**
     * 最近更新时间
     */
    @Column("updated_at")
    private OffsetDateTime updatedAt;
}

