/**
 * 打车报销管理控制器 API
 * 对应后端 AdminTaxiReimbursementController
 */

import { get, post, put, del } from '@/utils/request';
import type {
  TaxiReimbursement,
  TaxiReimbursementQueryParams,
  TaxiReimbursementPageQueryParams,
  PageResult,
} from '@/types';

/**
 * 创建打车报销记录
 * POST /api/admin/taxi-reimbursements
 */
export const createTaxiReimbursement = (
  data: Omit<TaxiReimbursement, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TaxiReimbursement> => {
  return post<TaxiReimbursement>('/api/admin/taxi-reimbursements', data);
};

/**
 * 根据ID查询打车报销记录
 * GET /api/admin/taxi-reimbursements/{id}
 */
export const getTaxiReimbursementById = (id: string): Promise<TaxiReimbursement> => {
  return get<TaxiReimbursement>(`/api/admin/taxi-reimbursements/${id}`);
};

/**
 * 更新打车报销记录
 * PUT /api/admin/taxi-reimbursements/{id}
 */
export const updateTaxiReimbursement = (
  id: string,
  data: Partial<Omit<TaxiReimbursement, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<TaxiReimbursement> => {
  return put<TaxiReimbursement>(`/api/admin/taxi-reimbursements/${id}`, data);
};

/**
 * 删除打车报销记录
 * DELETE /api/admin/taxi-reimbursements/{id}
 */
export const deleteTaxiReimbursement = (id: string): Promise<void> => {
  return del<void>(`/api/admin/taxi-reimbursements/${id}`);
};

/**
 * 不分页条件查询打车报销记录
 * GET /api/admin/taxi-reimbursements/query
 */
export const queryTaxiReimbursements = (
  params?: TaxiReimbursementQueryParams
): Promise<TaxiReimbursement[]> => {
  return get<TaxiReimbursement[]>('/api/admin/taxi-reimbursements/query', params);
};

/**
 * 分页条件查询打车报销记录
 * GET /api/admin/taxi-reimbursements/query/page
 */
export const queryTaxiReimbursementsWithPage = (
  params?: TaxiReimbursementPageQueryParams
): Promise<PageResult<TaxiReimbursement>> => {
  return get<PageResult<TaxiReimbursement>>('/api/admin/taxi-reimbursements/query/page', params);
};

