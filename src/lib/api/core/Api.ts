/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

import type {
  AirwallexEvent,
  AnnounceFeeReq,
  AnnouncementBroadcastRes,
  AnnouncementSendRes,
  BookingAnalysisRes,
  BookingBoostPageRes,
  BookingCountRes,
  BookingPrincipalRes,
  BookingQueueRes,
  BookingRes,
  BookingSearchCountRes,
  BookingStatRes,
  CancelWithdrawalReq,
  CapturedPaymentRes,
  CostPolicyPrincipalRes,
  CostPolicyReq,
  CostPrincipalRes,
  CostSlotSummaryRes,
  CostSummaryRes,
  CreateBookingReq,
  CreateCostReq,
  CreateDiscountReq,
  CreateMilestoneReq,
  CreatePassengerReq,
  CreatePaymentReq,
  CreatePaymentRes,
  CreateUserReq,
  CreateWithdrawalReq,
  DiscountPrincipalRes,
  ErrorInfo,
  FeeChangeRes,
  FeeRes,
  GatewayFeeSyncRes,
  KtmbCostChangeRes,
  KtmbCostRes,
  LatestScheduleRes,
  MaterializedCostRes,
  MilestoneRes,
  PassengerPrincipalRes,
  PassengerRes,
  PaymentPrincipalRes,
  PaymentRes,
  PriorityAccessRes,
  PriorityEligibilityRes,
  PrioritySettingsRes,
  RefundablePoolRes,
  RejectWithdrawalReq,
  ScheduleBulkUpdateReq,
  SchedulePrincipalRes,
  ScheduleRecordReq,
  SetFeeReq,
  SetKtmbCostReq,
  SetPrioritySettingsReq,
  SetWithdrawalSettingsReq,
  TimingPrincipalRes,
  TimingReq,
  TimingRes,
  TransactionPrincipalRes,
  TransactionRes,
  TransferReq,
  UpdateDiscountReq,
  UpdatePassengerReq,
  UpdateUserReq,
  UserExistRes,
  UserPrincipalRes,
  UserRes,
  WalletPrincipalRes,
  WalletRes,
  WithdrawalPrincipalRes,
  WithdrawalRes,
  WithdrawalSettingsRes,
} from './data-contracts';
import { ContentType, HttpClient, type RequestParams } from './http-client';

export class Api<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
  /**
   * No description
   *
   * @tags Admin
   * @name VAdminInflowCreate
   * @request POST:/api/v{version}/Admin/inflow/{userId}
   * @secure
   */
  vAdminInflowCreate = (userId: string, version: string, data: TransferReq, params: RequestParams = {}) =>
    this.request<WalletPrincipalRes, any>({
      path: `/api/v${version}/Admin/inflow/${userId}`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Admin
   * @name VAdminOutflowCreate
   * @request POST:/api/v{version}/Admin/outflow/{userId}
   * @secure
   */
  vAdminOutflowCreate = (userId: string, version: string, data: TransferReq, params: RequestParams = {}) =>
    this.request<WalletPrincipalRes, any>({
      path: `/api/v${version}/Admin/outflow/${userId}`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Admin
   * @name VAdminPromoCreate
   * @request POST:/api/v{version}/Admin/promo/{userId}
   * @secure
   */
  vAdminPromoCreate = (userId: string, version: string, data: TransferReq, params: RequestParams = {}) =>
    this.request<WalletPrincipalRes, any>({
      path: `/api/v${version}/Admin/promo/${userId}`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Announcement
   * @name VAnnouncementFeeCreate
   * @request POST:/api/v{version}/Announcement/fee
   * @secure
   */
  vAnnouncementFeeCreate = (version: string, data: AnnounceFeeReq, params: RequestParams = {}) =>
    this.request<AnnouncementBroadcastRes, any>({
      path: `/api/v${version}/Announcement/fee`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Announcement
   * @name VAnnouncementFeeCreate2
   * @request POST:/api/v{version}/Announcement/fee/{userId}
   * @originalName vAnnouncementFeeCreate
   * @duplicate
   * @secure
   */
  vAnnouncementFeeCreate2 = (userId: string, version: string, data: AnnounceFeeReq, params: RequestParams = {}) =>
    this.request<AnnouncementSendRes, any>({
      path: `/api/v${version}/Announcement/fee/${userId}`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingDetail
   * @request GET:/api/v{version}/Booking
   * @secure
   */
  vBookingDetail = (
    version: string,
    query?: {
      Date?: string;
      Direction?: string;
      Status?: string;
      Time?: string;
      UserId?: string;
      PassportNumber?: string;
      PassengerName?: string;
      SortBy?: string;
      /** @format int32 */
      Limit?: number;
      /** @format int32 */
      Skip?: number;
    },
    params: RequestParams = {},
  ) =>
    this.request<BookingPrincipalRes[], any>({
      path: `/api/v${version}/Booking`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingSearchCountDetail
   * @request GET:/api/v{version}/Booking/search/count
   * @secure
   */
  vBookingSearchCountDetail = (
    version: string,
    query?: {
      Date?: string;
      Direction?: string;
      Status?: string;
      Time?: string;
      UserId?: string;
      PassportNumber?: string;
      PassengerName?: string;
      SortBy?: string;
      /** @format int32 */
      Limit?: number;
      /** @format int32 */
      Skip?: number;
    },
    params: RequestParams = {},
  ) =>
    this.request<BookingSearchCountRes, any>({
      path: `/api/v${version}/Booking/search/count`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingStatsDetail
   * @request GET:/api/v{version}/Booking/stats
   * @secure
   */
  vBookingStatsDetail = (
    version: string,
    query?: {
      after?: string;
      before?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<BookingStatRes[], any>({
      path: `/api/v${version}/Booking/stats`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * HAND-ADDED (zinc PR #37) pending swagger regeneration — sales/revenue
   * analysis for the admin Analysis page (OnlyAdmin). After/Before are
   * dd-MM-yyyy, inclusive, on the SGT calendar date of completion.
   *
   * @tags Booking
   * @name VBookingAnalysisDetail
   * @request GET:/api/v{version}/Booking/analysis
   * @secure
   */
  vBookingAnalysisDetail = (
    version: string,
    query?: {
      After?: string;
      Before?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<BookingAnalysisRes, any>({
      path: `/api/v${version}/Booking/analysis`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * HAND-ADDED (zinc PR #39) pending swagger regeneration — the boost
   * ledger, newest first, paginated (OnlyAdmin; Limit ≤ 200). After/Before
   * are dd-MM-yyyy on the SGT calendar date of the boost.
   *
   * @tags Booking
   * @name VBookingAnalysisBoostsDetail
   * @request GET:/api/v{version}/Booking/analysis/boosts
   * @secure
   */
  vBookingAnalysisBoostsDetail = (
    version: string,
    query?: {
      After?: string;
      Before?: string;
      /** @format int32 */
      Limit?: number;
      /** @format int32 */
      Skip?: number;
    },
    params: RequestParams = {},
  ) =>
    this.request<BookingBoostPageRes, any>({
      path: `/api/v${version}/Booking/analysis/boosts`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * HAND-ADDED (zinc PR #39) pending swagger regeneration — the KTMB ticket
   * cost in effect right now per direction + queued future changes
   * (AdminOrTin).
   *
   * @tags Booking
   * @name VBookingKtmbCostCurrentDetail
   * @request GET:/api/v{version}/Booking/ktmb-cost/current
   * @secure
   */
  vBookingKtmbCostCurrentDetail = (version: string, params: RequestParams = {}) =>
    this.request<KtmbCostRes, any>({
      path: `/api/v${version}/Booking/ktmb-cost/current`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * HAND-ADDED (zinc PR #39) pending swagger regeneration — queue a
   * per-direction KTMB cost change, immediate when effectiveAt is omitted
   * (OnlyAdmin; insert-only, effective-dated like the withdrawal fee queue).
   *
   * @tags Booking
   * @name VBookingKtmbCostCreate
   * @request POST:/api/v{version}/Booking/ktmb-cost
   * @secure
   */
  vBookingKtmbCostCreate = (version: string, data: SetKtmbCostReq, params: RequestParams = {}) =>
    this.request<KtmbCostChangeRes, any>({
      path: `/api/v${version}/Booking/ktmb-cost`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingRefundDetail
   * @request GET:/api/v{version}/Booking/refund
   * @secure
   */
  vBookingRefundDetail = (version: string, params: RequestParams = {}) =>
    this.request<BookingPrincipalRes[], any>({
      path: `/api/v${version}/Booking/refund`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingRecoveringCreate
   * @request POST:/api/v{version}/Booking/recovering/{id}
   * @secure
   */
  vBookingRecoveringCreate = (id: string, version: string, params: RequestParams = {}) =>
    this.request<BookingPrincipalRes, any>({
      path: `/api/v${version}/Booking/recovering/${id}`,
      method: 'POST',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingDuplicateCreate
   * @request POST:/api/v{version}/Booking/duplicate/{id}
   * @secure
   */
  vBookingDuplicateCreate = (id: string, version: string, params: RequestParams = {}) =>
    this.request<BookingPrincipalRes, any>({
      path: `/api/v${version}/Booking/duplicate/${id}`,
      method: 'POST',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingManualInterventionCreate
   * @request POST:/api/v{version}/Booking/manual-intervention/{id}
   * @secure
   */
  vBookingManualInterventionCreate = (id: string, version: string, params: RequestParams = {}) =>
    this.request<BookingPrincipalRes, any>({
      path: `/api/v${version}/Booking/manual-intervention/${id}`,
      method: 'POST',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingReserveDetail
   * @request GET:/api/v{version}/Booking/reserve/{Direction}/{Date}/{Time}
   * @secure
   */
  vBookingReserveDetail = (
    date: string,
    direction: string,
    time: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<BookingPrincipalRes, any>({
      path: `/api/v${version}/Booking/reserve/${direction}/${date}/${time}`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingDetail2
   * @request GET:/api/v{version}/Booking/{id}
   * @originalName vBookingDetail
   * @duplicate
   * @secure
   */
  vBookingDetail2 = (
    id: string,
    version: string,
    query?: {
      userId?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<BookingRes, any>({
      path: `/api/v${version}/Booking/${id}`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingQueueDetail
   * @request GET:/api/v{version}/Booking/{id}/queue
   * @secure
   */
  vBookingQueueDetail = (
    id: string,
    version: string,
    query?: {
      userId?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<BookingQueueRes, any>({
      path: `/api/v${version}/Booking/${id}/queue`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * HAND-ADDED (zinc PR #42): booking-scoped priority eligibility — hour
   * policies evaluated against the timeslot's departure, plus slotCap /
   * slotsLeft when a cap is configured.
   *
   * @tags Booking
   * @name VBookingPriorityEligibilityDetail2
   * @request GET:/api/v{version}/Booking/{id}/priority/eligibility
   * @secure
   */
  vBookingPriorityEligibilityDetail2 = (
    id: string,
    version: string,
    query?: {
      userId?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<PriorityEligibilityRes, any>({
      path: `/api/v${version}/Booking/${id}/priority/eligibility`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingCompleteCreate
   * @request POST:/api/v{version}/Booking/complete/{id}
   * @secure
   */
  vBookingCompleteCreate = (
    id: string,
    version: string,
    data: {
      /** @format binary */
      file?: File;
    },
    query?: {
      bookingNo?: string;
      ticketNo?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<BookingPrincipalRes, any>({
      path: `/api/v${version}/Booking/complete/${id}`,
      method: 'POST',
      query: query,
      body: data,
      secure: true,
      type: ContentType.FormData,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingCompleteNoCollectCreate
   * @request POST:/api/v{version}/Booking/complete-no-collect/{id}
   * @secure
   */
  vBookingCompleteNoCollectCreate = (
    id: string,
    version: string,
    data: {
      /** @format binary */
      file?: File;
    },
    query?: {
      bookingNo?: string;
      ticketNo?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<BookingPrincipalRes, any>({
      path: `/api/v${version}/Booking/complete-no-collect/${id}`,
      method: 'POST',
      query: query,
      body: data,
      secure: true,
      type: ContentType.FormData,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingCountsDetail
   * @request GET:/api/v{version}/Booking/counts
   * @secure
   */
  vBookingCountsDetail = (version: string, params: RequestParams = {}) =>
    this.request<BookingCountRes[], any>({
      path: `/api/v${version}/Booking/counts`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingCountsDetail2
   * @request GET:/api/v{version}/Booking/counts/{Direction}/{Date}
   * @originalName vBookingCountsDetail
   * @duplicate
   * @secure
   */
  vBookingCountsDetail2 = (date: string, direction: string, version: string, params: RequestParams = {}) =>
    this.request<BookingCountRes[], any>({
      path: `/api/v${version}/Booking/counts/${direction}/${date}`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingBuyingCreate
   * @request POST:/api/v{version}/Booking/buying/{id}
   * @secure
   */
  vBookingBuyingCreate = (id: string, version: string, params: RequestParams = {}) =>
    this.request<BookingPrincipalRes, any>({
      path: `/api/v${version}/Booking/buying/${id}`,
      method: 'POST',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingRevertCreate
   * @request POST:/api/v{version}/Booking/revert/{id}
   * @secure
   */
  vBookingRevertCreate = (
    id: string,
    version: string,
    query?: {
      force?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.request<BookingPrincipalRes, any>({
      path: `/api/v${version}/Booking/revert/${id}`,
      method: 'POST',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingRefundCreate
   * @request POST:/api/v{version}/Booking/refund/{id}
   * @secure
   */
  vBookingRefundCreate = (id: string, version: string, params: RequestParams = {}) =>
    this.request<BookingPrincipalRes, any>({
      path: `/api/v${version}/Booking/refund/${id}`,
      method: 'POST',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingPurchaseCreate
   * @request POST:/api/v{version}/Booking/{userId}/purchase
   * @secure
   */
  vBookingPurchaseCreate = (userId: string, version: string, data: CreateBookingReq, params: RequestParams = {}) =>
    this.request<BookingPrincipalRes, any>({
      path: `/api/v${version}/Booking/${userId}/purchase`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingCancelCreate
   * @request POST:/api/v{version}/Booking/cancel/{id}
   * @secure
   */
  vBookingCancelCreate = (
    id: string,
    version: string,
    query?: {
      userId?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<BookingPrincipalRes, any>({
      path: `/api/v${version}/Booking/cancel/${id}`,
      method: 'POST',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingTerminateCreate
   * @request POST:/api/v{version}/Booking/terminate/{id}
   * @secure
   */
  vBookingTerminateCreate = (
    id: string,
    version: string,
    query?: {
      userId?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<BookingPrincipalRes, any>({
      path: `/api/v${version}/Booking/terminate/${id}`,
      method: 'POST',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * HAND-ADDED (zinc slot-aware eligibility) pending swagger regeneration —
   * optional slot context (Direction WToJ|JToW, Date dd-MM-yyyy, Time
   * HH:mm:ss, all three together or none) so hour-bounded policies and the
   * slot cap apply to the timeslot about to be purchased.
   *
   * @tags Booking
   * @name VBookingPriorityEligibilityDetail
   * @request GET:/api/v{version}/Booking/priority/eligibility
   * @secure
   */
  vBookingPriorityEligibilityDetail = (
    version: string,
    query?: {
      Direction?: string;
      Date?: string;
      Time?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<PriorityEligibilityRes, any>({
      path: `/api/v${version}/Booking/priority/eligibility`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingPrioritySettingsDetail
   * @request GET:/api/v{version}/Booking/priority/settings
   * @secure
   */
  vBookingPrioritySettingsDetail = (version: string, params: RequestParams = {}) =>
    this.request<PrioritySettingsRes, any>({
      path: `/api/v${version}/Booking/priority/settings`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingPrioritySettingsCreate
   * @request POST:/api/v{version}/Booking/priority/settings
   * @secure
   */
  vBookingPrioritySettingsCreate = (version: string, data: SetPrioritySettingsReq, params: RequestParams = {}) =>
    this.request<PrioritySettingsRes, any>({
      path: `/api/v${version}/Booking/priority/settings`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingPriorityAccessDetail
   * @request GET:/api/v{version}/Booking/priority/access
   * @secure
   */
  vBookingPriorityAccessDetail = (version: string, params: RequestParams = {}) =>
    this.request<PriorityAccessRes[], any>({
      path: `/api/v${version}/Booking/priority/access`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingPriorityAccessCreate
   * @request POST:/api/v{version}/Booking/priority/access/{userId}
   * @secure
   */
  vBookingPriorityAccessCreate = (userId: string, version: string, params: RequestParams = {}) =>
    this.request<PriorityAccessRes, any>({
      path: `/api/v${version}/Booking/priority/access/${userId}`,
      method: 'POST',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingPriorityAccessDelete
   * @request DELETE:/api/v{version}/Booking/priority/access/{userId}
   * @secure
   */
  vBookingPriorityAccessDelete = (userId: string, version: string, params: RequestParams = {}) =>
    this.request<void, any>({
      path: `/api/v${version}/Booking/priority/access/${userId}`,
      method: 'DELETE',
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingPrioritizeCreate
   * @request POST:/api/v{version}/Booking/{id}/prioritize
   * @secure
   */
  vBookingPrioritizeCreate = (
    id: string,
    version: string,
    query?: {
      userId?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<BookingPrincipalRes, any>({
      path: `/api/v${version}/Booking/${id}/prioritize`,
      method: 'POST',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Cost
   * @name VCostDetail
   * @request GET:/api/v{version}/Cost
   * @secure
   */
  vCostDetail = (version: string, params: RequestParams = {}) =>
    this.request<CostPrincipalRes[], any>({
      path: `/api/v${version}/Cost`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Cost
   * @name VCostCreate
   * @request POST:/api/v{version}/Cost
   * @secure
   */
  vCostCreate = (version: string, data: CreateCostReq, params: RequestParams = {}) =>
    this.request<CostPrincipalRes, any>({
      path: `/api/v${version}/Cost`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Cost
   * @name VCostCurrentDetail
   * @request GET:/api/v{version}/Cost/current
   * @secure
   */
  vCostCurrentDetail = (version: string, params: RequestParams = {}) =>
    this.request<CostPrincipalRes, any>({
      path: `/api/v${version}/Cost/current`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Cost
   * @name VCostSelfDetail
   * @request GET:/api/v{version}/Cost/self
   * @secure
   */
  vCostSelfDetail = (version: string, params: RequestParams = {}) =>
    this.request<MaterializedCostRes, any>({
      path: `/api/v${version}/Cost/self`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Cost
   * @name VCostSummaryDetail
   * @request GET:/api/v{version}/Cost/summary
   * @secure
   */
  vCostSummaryDetail = (
    version: string,
    query?: {
      Date?: string;
      Time?: string;
      Direction?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<CostSummaryRes, any>({
      path: `/api/v${version}/Cost/summary`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Cost
   * @name VCostSummaryBatchDetail
   * @request GET:/api/v{version}/Cost/summary/batch
   * @secure
   */
  vCostSummaryBatchDetail = (
    version: string,
    query?: {
      Date?: string;
      Direction?: string;
      /** comma-separated HH:mm:ss list, 1-100 entries */
      Times?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<CostSlotSummaryRes[], any>({
      path: `/api/v${version}/Cost/summary/batch`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Cost
   * @name VCostPoliciesDetail
   * @request GET:/api/v{version}/Cost/policies
   * @secure
   */
  vCostPoliciesDetail = (version: string, params: RequestParams = {}) =>
    this.request<CostPolicyPrincipalRes[], any>({
      path: `/api/v${version}/Cost/policies`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Cost
   * @name VCostPoliciesCreate
   * @request POST:/api/v{version}/Cost/policies
   * @secure
   */
  vCostPoliciesCreate = (version: string, data: CostPolicyReq, params: RequestParams = {}) =>
    this.request<CostPolicyPrincipalRes, any>({
      path: `/api/v${version}/Cost/policies`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Cost
   * @name VCostPoliciesUpdate
   * @request PUT:/api/v{version}/Cost/policies/{id}
   * @secure
   */
  vCostPoliciesUpdate = (id: string, version: string, data: CostPolicyReq, params: RequestParams = {}) =>
    this.request<CostPolicyPrincipalRes, any>({
      path: `/api/v${version}/Cost/policies/${id}`,
      method: 'PUT',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Cost
   * @name VCostPoliciesDelete
   * @request DELETE:/api/v{version}/Cost/policies/{id}
   * @secure
   */
  vCostPoliciesDelete = (id: string, version: string, params: RequestParams = {}) =>
    this.request<void, any>({
      path: `/api/v${version}/Cost/policies/${id}`,
      method: 'DELETE',
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Discount
   * @name VDiscountDetail
   * @request GET:/api/v{version}/Discount
   * @secure
   */
  vDiscountDetail = (
    version: string,
    query?: {
      Search?: string;
      DiscountType?: string;
      MatchMode?: string;
      MatchTarget?: string[];
      Disabled?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.request<DiscountPrincipalRes[], any>({
      path: `/api/v${version}/Discount`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Discount
   * @name VDiscountCreate
   * @request POST:/api/v{version}/Discount
   * @secure
   */
  vDiscountCreate = (version: string, data: CreateDiscountReq, params: RequestParams = {}) =>
    this.request<DiscountPrincipalRes, any>({
      path: `/api/v${version}/Discount`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Discount
   * @name VDiscountDetail2
   * @request GET:/api/v{version}/Discount/{id}
   * @originalName vDiscountDetail
   * @duplicate
   * @secure
   */
  vDiscountDetail2 = (id: string, version: string, params: RequestParams = {}) =>
    this.request<DiscountPrincipalRes, any>({
      path: `/api/v${version}/Discount/${id}`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Discount
   * @name VDiscountUpdate
   * @request PUT:/api/v{version}/Discount/{id}
   * @secure
   */
  vDiscountUpdate = (id: string, version: string, data: UpdateDiscountReq, params: RequestParams = {}) =>
    this.request<DiscountPrincipalRes, any>({
      path: `/api/v${version}/Discount/${id}`,
      method: 'PUT',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Discount
   * @name VDiscountDelete
   * @request DELETE:/api/v{version}/Discount/{id}
   * @secure
   */
  vDiscountDelete = (id: string, version: string, params: RequestParams = {}) =>
    this.request<void, any>({
      path: `/api/v${version}/Discount/${id}`,
      method: 'DELETE',
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Milestone
   * @name VMilestoneList
   * @request GET:/api/v{version}/Milestone
   * @secure
   */
  vMilestoneList = (version: string, params: RequestParams = {}) =>
    this.request<MilestoneRes[], any>({
      path: `/api/v${version}/Milestone`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Milestone
   * @name VMilestoneCreate
   * @request POST:/api/v{version}/Milestone
   * @secure
   */
  vMilestoneCreate = (version: string, data: CreateMilestoneReq, params: RequestParams = {}) =>
    this.request<MilestoneRes, any>({
      path: `/api/v${version}/Milestone`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Milestone
   * @name VMilestoneDelete
   * @request DELETE:/api/v{version}/Milestone/{id}
   * @secure
   */
  vMilestoneDelete = (id: string, version: string, params: RequestParams = {}) =>
    this.request<MilestoneRes, any>({
      path: `/api/v${version}/Milestone/${id}`,
      method: 'DELETE',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Passenger
   * @name VPassengerDetail
   * @request GET:/api/v{version}/Passenger
   * @secure
   */
  vPassengerDetail = (
    version: string,
    query?: {
      UserId?: string;
      Name?: string;
      /** @format int32 */
      Limit?: number;
      /** @format int32 */
      Skip?: number;
    },
    params: RequestParams = {},
  ) =>
    this.request<PassengerPrincipalRes[], any>({
      path: `/api/v${version}/Passenger`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Passenger
   * @name VPassengerDetail2
   * @request GET:/api/v{version}/Passenger/{userId}/{id}
   * @originalName vPassengerDetail
   * @duplicate
   * @secure
   */
  vPassengerDetail2 = (userId: string, id: string, version: string, params: RequestParams = {}) =>
    this.request<PassengerRes, any>({
      path: `/api/v${version}/Passenger/${userId}/${id}`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Passenger
   * @name VPassengerCreate
   * @request POST:/api/v{version}/Passenger/{userId}
   * @secure
   */
  vPassengerCreate = (userId: string, version: string, data: CreatePassengerReq, params: RequestParams = {}) =>
    this.request<PassengerPrincipalRes, any>({
      path: `/api/v${version}/Passenger/${userId}`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Passenger
   * @name VPassengerUpdate
   * @request PUT:/api/v{version}/Passenger/{id}
   * @secure
   */
  vPassengerUpdate = (
    id: string,
    version: string,
    data: UpdatePassengerReq,
    query?: {
      userId?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<PassengerPrincipalRes, any>({
      path: `/api/v${version}/Passenger/${id}`,
      method: 'PUT',
      query: query,
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Passenger
   * @name VPassengerDelete
   * @request DELETE:/api/v{version}/Passenger/{id}
   * @secure
   */
  vPassengerDelete = (
    id: string,
    version: string,
    query?: {
      userId?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<void, any>({
      path: `/api/v${version}/Passenger/${id}`,
      method: 'DELETE',
      query: query,
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Payment
   * @name VPaymentDetail
   * @request GET:/api/v{version}/Payment
   * @secure
   */
  vPaymentDetail = (
    version: string,
    query?: {
      /** @format uuid */
      Id?: string;
      /** @format uuid */
      WalletId?: string;
      /** @format uuid */
      TransactionId?: string;
      Reference?: string;
      Gateway?: string;
      /** @format double */
      Min?: number;
      /** @format double */
      Max?: number;
      CreatedBefore?: string;
      CreatedAfter?: string;
      LastUpdatedBefore?: string;
      LastUpdatedAfter?: string;
      Status?: string;
      /** @format int32 */
      Limit?: number;
      /** @format int32 */
      Skip?: number;
    },
    params: RequestParams = {},
  ) =>
    this.request<PaymentPrincipalRes[], any>({
      path: `/api/v${version}/Payment`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * HAND-ADDED (zinc PR #37) pending swagger regeneration — payment intents
   * that captured money in the (inclusive SGT date) range, newest first,
   * capped at 100 (OnlyAdmin). After/Before are dd-MM-yyyy.
   *
   * @tags Payment
   * @name VPaymentCapturedDetail
   * @request GET:/api/v{version}/Payment/captured
   * @secure
   */
  vPaymentCapturedDetail = (
    version: string,
    query?: {
      After?: string;
      Before?: string;
      /** @format int32 */
      Limit?: number;
    },
    params: RequestParams = {},
  ) =>
    this.request<CapturedPaymentRes[], any>({
      path: `/api/v${version}/Payment/captured`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * HAND-ADDED (zinc PR #39) pending swagger regeneration — pull Airwallex's
   * own fees for the range's captured intents into the analysis store
   * (AdminOrTin). After/Before are dd-MM-yyyy; fees post with delay, so
   * `missing` intents may resolve on a later sync; hasMore = run again.
   *
   * @tags Payment
   * @name VPaymentGatewayFeesSyncCreate
   * @request POST:/api/v{version}/Payment/gateway-fees/sync
   * @secure
   */
  vPaymentGatewayFeesSyncCreate = (
    version: string,
    query?: {
      After?: string;
      Before?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<GatewayFeeSyncRes, any>({
      path: `/api/v${version}/Payment/gateway-fees/sync`,
      method: 'POST',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Payment
   * @name VPaymentIdDetail
   * @request GET:/api/v{version}/Payment/id/{id}
   * @secure
   */
  vPaymentIdDetail = (id: string, version: string, params: RequestParams = {}) =>
    this.request<PaymentRes, any>({
      path: `/api/v${version}/Payment/id/${id}`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Payment
   * @name VPaymentIdDelete
   * @request DELETE:/api/v{version}/Payment/id/{id}
   * @secure
   */
  vPaymentIdDelete = (id: string, version: string, params: RequestParams = {}) =>
    this.request<PaymentRes, any>({
      path: `/api/v${version}/Payment/id/${id}`,
      method: 'DELETE',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Payment
   * @name VPaymentReferenceDetail
   * @request GET:/api/v{version}/Payment/reference/{reference}
   * @secure
   */
  vPaymentReferenceDetail = (reference: string, version: string, params: RequestParams = {}) =>
    this.request<PaymentRes, any>({
      path: `/api/v${version}/Payment/reference/${reference}`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Payment
   * @name VPaymentReferenceDelete
   * @request DELETE:/api/v{version}/Payment/reference/{reference}
   * @secure
   */
  vPaymentReferenceDelete = (reference: string, version: string, params: RequestParams = {}) =>
    this.request<PaymentRes, any>({
      path: `/api/v${version}/Payment/reference/${reference}`,
      method: 'DELETE',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Payment
   * @name VPaymentCreate
   * @request POST:/api/v{version}/Payment/{walletId}
   * @secure
   */
  vPaymentCreate = (
    walletId: string,
    version: string,
    data: CreatePaymentReq,
    query?: {
      userId?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<CreatePaymentRes, any>({
      path: `/api/v${version}/Payment/${walletId}`,
      method: 'POST',
      query: query,
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Payment
   * @name VPaymentWebhookCreate
   * @request POST:/api/v{version}/Payment/webhook
   * @secure
   */
  vPaymentWebhookCreate = (version: string, data: AirwallexEvent, params: RequestParams = {}) =>
    this.request<void, any>({
      path: `/api/v${version}/Payment/webhook`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags Schedule
   * @name VScheduleLatestDetail
   * @request GET:/api/v{version}/Schedule/latest
   * @secure
   */
  vScheduleLatestDetail = (version: string, params: RequestParams = {}) =>
    this.request<LatestScheduleRes, any>({
      path: `/api/v${version}/Schedule/latest`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Schedule
   * @name VScheduleRangeDetail
   * @request GET:/api/v{version}/Schedule/range/{From}/{To}
   * @secure
   */
  vScheduleRangeDetail = (from: string, to: string, version: string, params: RequestParams = {}) =>
    this.request<SchedulePrincipalRes[], any>({
      path: `/api/v${version}/Schedule/range/${from}/${to}`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Schedule
   * @name VScheduleDetail
   * @request GET:/api/v{version}/Schedule/{Date}
   * @secure
   */
  vScheduleDetail = (date: string, version: string, params: RequestParams = {}) =>
    this.request<SchedulePrincipalRes, any>({
      path: `/api/v${version}/Schedule/${date}`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Schedule
   * @name VScheduleUpdate
   * @request PUT:/api/v{version}/Schedule/{Date}
   * @secure
   */
  vScheduleUpdate = (date: string, version: string, data: ScheduleRecordReq, params: RequestParams = {}) =>
    this.request<SchedulePrincipalRes, any>({
      path: `/api/v${version}/Schedule/${date}`,
      method: 'PUT',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Schedule
   * @name VScheduleDelete
   * @request DELETE:/api/v{version}/Schedule/{Date}
   * @secure
   */
  vScheduleDelete = (date: string, version: string, params: RequestParams = {}) =>
    this.request<void, any>({
      path: `/api/v${version}/Schedule/${date}`,
      method: 'DELETE',
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Schedule
   * @name VScheduleBulkUpdate
   * @request PUT:/api/v{version}/Schedule/bulk
   * @secure
   */
  vScheduleBulkUpdate = (version: string, data: ScheduleBulkUpdateReq, params: RequestParams = {}) =>
    this.request<void, any>({
      path: `/api/v${version}/Schedule/bulk`,
      method: 'PUT',
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags Timing
   * @name VTimingDetail
   * @request GET:/api/v{version}/Timing/{Direction}
   * @secure
   */
  vTimingDetail = (direction: string, version: string, params: RequestParams = {}) =>
    this.request<TimingRes, any>({
      path: `/api/v${version}/Timing/${direction}`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Timing
   * @name VTimingUpdate
   * @request PUT:/api/v{version}/Timing/{Direction}
   * @secure
   */
  vTimingUpdate = (direction: string, version: string, data: TimingReq, params: RequestParams = {}) =>
    this.request<TimingPrincipalRes, any>({
      path: `/api/v${version}/Timing/${direction}`,
      method: 'PUT',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Transaction
   * @name VTransactionDetail
   * @request GET:/api/v{version}/Transaction
   * @secure
   */
  vTransactionDetail = (
    version: string,
    query?: {
      Search?: string;
      TransactionType?: string;
      /** @format uuid */
      Id?: string;
      /** @format uuid */
      WalletId?: string;
      userId?: string;
      Before?: string;
      After?: string;
      /** @format int32 */
      Limit?: number;
      /** @format int32 */
      Skip?: number;
    },
    params: RequestParams = {},
  ) =>
    this.request<TransactionPrincipalRes[], any>({
      path: `/api/v${version}/Transaction`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Transaction
   * @name VTransactionDetail2
   * @request GET:/api/v{version}/Transaction/{id}
   * @originalName vTransactionDetail
   * @duplicate
   * @secure
   */
  vTransactionDetail2 = (
    id: string,
    version: string,
    query?: {
      userId?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<TransactionRes, any>({
      path: `/api/v${version}/Transaction/${id}`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Transaction
   * @name VTransactionDelete
   * @request DELETE:/api/v{version}/Transaction/{id}
   * @secure
   */
  vTransactionDelete = (id: string, version: string, params: RequestParams = {}) =>
    this.request<TransactionRes, any>({
      path: `/api/v${version}/Transaction/${id}`,
      method: 'DELETE',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name VUserDetail
   * @request GET:/api/v{version}/User
   * @secure
   */
  vUserDetail = (
    version: string,
    query?: {
      Id?: string;
      Username?: string;
      Email?: string;
      /** @format int32 */
      Limit?: number;
      /** @format int32 */
      Skip?: number;
    },
    params: RequestParams = {},
  ) =>
    this.request<UserPrincipalRes[], any>({
      path: `/api/v${version}/User`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name VUserCreate
   * @request POST:/api/v{version}/User
   * @secure
   */
  vUserCreate = (version: string, data: CreateUserReq, params: RequestParams = {}) =>
    this.request<UserPrincipalRes, any>({
      path: `/api/v${version}/User`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name VUserMeDetail
   * @request GET:/api/v{version}/User/Me
   * @secure
   */
  vUserMeDetail = (version: string, params: RequestParams = {}) =>
    this.request<string, any>({
      path: `/api/v${version}/User/Me`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name VUserMeAllDetail
   * @request GET:/api/v{version}/User/Me/All
   * @secure
   */
  vUserMeAllDetail = (version: string, params: RequestParams = {}) =>
    this.request<UserRes, any>({
      path: `/api/v${version}/User/Me/All`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name VUserDetail2
   * @request GET:/api/v{version}/User/{id}
   * @originalName vUserDetail
   * @duplicate
   * @secure
   */
  vUserDetail2 = (id: string, version: string, params: RequestParams = {}) =>
    this.request<UserRes, any>({
      path: `/api/v${version}/User/${id}`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name VUserUpdate
   * @request PUT:/api/v{version}/User/{id}
   * @secure
   */
  vUserUpdate = (id: string, version: string, data: UpdateUserReq, params: RequestParams = {}) =>
    this.request<UserPrincipalRes, any>({
      path: `/api/v${version}/User/${id}`,
      method: 'PUT',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name VUserDelete
   * @request DELETE:/api/v{version}/User/{id}
   * @secure
   */
  vUserDelete = (id: string, version: string, params: RequestParams = {}) =>
    this.request<void, any>({
      path: `/api/v${version}/User/${id}`,
      method: 'DELETE',
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name VUserRolesCreate
   * @request POST:/api/v{version}/User/{id}/roles/{role}
   * @secure
   */
  vUserRolesCreate = (id: string, role: string, version: string, params: RequestParams = {}) =>
    this.request<UserPrincipalRes, any>({
      path: `/api/v${version}/User/${id}/roles/${role}`,
      method: 'POST',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name VUserRolesDelete
   * @request DELETE:/api/v{version}/User/{id}/roles/{role}
   * @secure
   */
  vUserRolesDelete = (id: string, role: string, version: string, params: RequestParams = {}) =>
    this.request<UserPrincipalRes, any>({
      path: `/api/v${version}/User/${id}/roles/${role}`,
      method: 'DELETE',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name VUserUsernameDetail
   * @request GET:/api/v{version}/User/username/{username}
   * @secure
   */
  vUserUsernameDetail = (username: string, version: string, params: RequestParams = {}) =>
    this.request<UserRes, any>({
      path: `/api/v${version}/User/username/${username}`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name VUserExistDetail
   * @request GET:/api/v{version}/User/exist/{username}
   * @secure
   */
  vUserExistDetail = (username: string, version: string, params: RequestParams = {}) =>
    this.request<UserExistRes, any>({
      path: `/api/v${version}/User/exist/${username}`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags V1Error
   * @name VErrorInfoDetail
   * @request GET:/api/v{version}/error-info
   * @secure
   */
  vErrorInfoDetail = (version: string, params: RequestParams = {}) =>
    this.request<string[], any>({
      path: `/api/v${version}/error-info`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags V1Error
   * @name VErrorInfoDetail2
   * @request GET:/api/v{version}/error-info/{id}
   * @originalName vErrorInfoDetail
   * @duplicate
   * @secure
   */
  vErrorInfoDetail2 = (id: string, version: string, params: RequestParams = {}) =>
    this.request<ErrorInfo, any>({
      path: `/api/v${version}/error-info/${id}`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Wallet
   * @name VWalletDetail
   * @request GET:/api/v{version}/Wallet
   * @secure
   */
  vWalletDetail = (
    version: string,
    query?: {
      UserId?: string;
      /** @format uuid */
      Id?: string;
      /** @format int32 */
      Limit?: number;
      /** @format int32 */
      Skip?: number;
    },
    params: RequestParams = {},
  ) =>
    this.request<WalletPrincipalRes[], any>({
      path: `/api/v${version}/Wallet`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Wallet
   * @name VWalletDetail2
   * @request GET:/api/v{version}/Wallet/{id}
   * @originalName vWalletDetail
   * @duplicate
   * @secure
   */
  vWalletDetail2 = (
    id: string,
    version: string,
    query?: {
      userId?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<WalletRes, any>({
      path: `/api/v${version}/Wallet/${id}`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Wallet
   * @name VWalletUserDetail
   * @request GET:/api/v{version}/Wallet/user/{userId}
   * @secure
   */
  vWalletUserDetail = (userId: string, version: string, params: RequestParams = {}) =>
    this.request<WalletRes, any>({
      path: `/api/v${version}/Wallet/user/${userId}`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Withdrawal
   * @name VWithdrawalDetail
   * @request GET:/api/v{version}/Withdrawal
   * @secure
   */
  vWithdrawalDetail = (
    version: string,
    query?: {
      /** @format uuid */
      Id?: string;
      UserId?: string;
      CompleterId?: string;
      /** @format double */
      Min?: number;
      /** @format double */
      Max?: number;
      Status?: string;
      Before?: string;
      After?: string;
      /** @format int32 */
      Limit?: number;
      /** @format int32 */
      Skip?: number;
    },
    params: RequestParams = {},
  ) =>
    this.request<WithdrawalPrincipalRes[], any>({
      path: `/api/v${version}/Withdrawal`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Fee
   * @name VFeeDetail
   * @request GET:/api/v{version}/Fee/{type}
   * @secure
   */
  vFeeDetail = (type: string, version: string, params: RequestParams = {}) =>
    this.request<FeeRes, any>({
      path: `/api/v${version}/Fee/${type}`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Fee
   * @name VFeeCreate
   * @request POST:/api/v{version}/Fee/{type}
   * @secure
   */
  vFeeCreate = (type: string, version: string, data: SetFeeReq, params: RequestParams = {}) =>
    this.request<FeeChangeRes, any>({
      path: `/api/v${version}/Fee/${type}`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Fee
   * @name VFeeUpcomingDetail
   * @request GET:/api/v{version}/Fee/{type}/upcoming
   * @secure
   */
  vFeeUpcomingDetail = (type: string, version: string, params: RequestParams = {}) =>
    this.request<FeeChangeRes[], any>({
      path: `/api/v${version}/Fee/${type}/upcoming`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Fee
   * @name VFeeDelete
   * @request DELETE:/api/v{version}/Fee/{id}
   * @secure
   */
  vFeeDelete = (id: string, version: string, params: RequestParams = {}) =>
    this.request<void, any>({
      path: `/api/v${version}/Fee/${id}`,
      method: 'DELETE',
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Withdrawal
   * @name VWithdrawalDetail2
   * @request GET:/api/v{version}/Withdrawal/{id}
   * @originalName vWithdrawalDetail
   * @duplicate
   * @secure
   */
  vWithdrawalDetail2 = (
    id: string,
    version: string,
    query?: {
      userId?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<WithdrawalRes, any>({
      path: `/api/v${version}/Withdrawal/${id}`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Withdrawal
   * @name VWithdrawalDelete
   * @request DELETE:/api/v{version}/Withdrawal/{id}
   * @secure
   */
  vWithdrawalDelete = (id: string, version: string, params: RequestParams = {}) =>
    this.request<WithdrawalPrincipalRes, any>({
      path: `/api/v${version}/Withdrawal/${id}`,
      method: 'DELETE',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Withdrawal
   * @name VWithdrawalCreate
   * @request POST:/api/v{version}/Withdrawal/{userId}
   * @secure
   */
  vWithdrawalCreate = (userId: string, version: string, data: CreateWithdrawalReq, params: RequestParams = {}) =>
    this.request<WithdrawalPrincipalRes, any>({
      path: `/api/v${version}/Withdrawal/${userId}`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Withdrawal
   * @name VWithdrawalCancelCreate
   * @request POST:/api/v{version}/Withdrawal/{userId}/{id}/cancel
   * @secure
   */
  vWithdrawalCancelCreate = (
    id: string,
    userId: string,
    version: string,
    data: CancelWithdrawalReq,
    params: RequestParams = {},
  ) =>
    this.request<WithdrawalPrincipalRes, any>({
      path: `/api/v${version}/Withdrawal/${userId}/${id}/cancel`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Withdrawal
   * @name VWithdrawalApproveCreate
   * @request POST:/api/v{version}/Withdrawal/{id}/approve
   * @secure
   */
  vWithdrawalApproveCreate = (id: string, version: string, params: RequestParams = {}) =>
    this.request<WithdrawalPrincipalRes, any>({
      path: `/api/v${version}/Withdrawal/${id}/approve`,
      method: 'POST',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Withdrawal
   * @name VWithdrawalRejectCreate
   * @request POST:/api/v{version}/Withdrawal/{id}/reject
   * @secure
   */
  vWithdrawalRejectCreate = (id: string, version: string, data: RejectWithdrawalReq, params: RequestParams = {}) =>
    this.request<WithdrawalPrincipalRes, any>({
      path: `/api/v${version}/Withdrawal/${id}/reject`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Withdrawal
   * @name VWithdrawalCompleteCreate
   * @request POST:/api/v{version}/Withdrawal/{id}/complete
   * @secure
   */
  vWithdrawalCompleteCreate = (
    id: string,
    version: string,
    data: {
      /** @format binary */
      file?: File;
    },
    params: RequestParams = {},
  ) =>
    this.request<WithdrawalPrincipalRes, any>({
      path: `/api/v${version}/Withdrawal/${id}/complete`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.FormData,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Withdrawal
   * @name VWithdrawalCompletePayoutCreate
   * @request POST:/api/v{version}/Withdrawal/{id}/complete-payout
   * @secure
   */
  vWithdrawalCompletePayoutCreate = (id: string, version: string, params: RequestParams = {}) =>
    this.request<WithdrawalPrincipalRes, any>({
      path: `/api/v${version}/Withdrawal/${id}/complete-payout`,
      method: 'POST',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Withdrawal
   * @name VWithdrawalReconcileCreate
   * @request POST:/api/v{version}/Withdrawal/{id}/reconcile
   * @secure
   */
  vWithdrawalReconcileCreate = (id: string, version: string, params: RequestParams = {}) =>
    this.request<WithdrawalPrincipalRes, any>({
      path: `/api/v${version}/Withdrawal/${id}/reconcile`,
      method: 'POST',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * No description
   *
   * @tags Withdrawal
   * @name VWithdrawalRequeueCreate
   * @request POST:/api/v{version}/Withdrawal/{id}/requeue
   * @secure
   */
  vWithdrawalRequeueCreate = (id: string, version: string, params: RequestParams = {}) =>
    this.request<WithdrawalPrincipalRes, any>({
      path: `/api/v${version}/Withdrawal/${id}/requeue`,
      method: 'POST',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * HAND-ADDED (zinc PR #36) pending swagger regeneration — the user's
   * card-refundable pool (owner or admin).
   *
   * @tags Withdrawal
   * @name VWithdrawalRefundableDetail
   * @request GET:/api/v{version}/Withdrawal/refundable/{userId}
   * @secure
   */
  vWithdrawalRefundableDetail = (userId: string, version: string, params: RequestParams = {}) =>
    this.request<RefundablePoolRes, any>({
      path: `/api/v${version}/Withdrawal/refundable/${userId}`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * HAND-ADDED (zinc withdrawal-policy PR) pending swagger regeneration —
   * the current withdrawal-method policy (any authenticated user).
   *
   * @tags Withdrawal
   * @name VWithdrawalSettingsCurrentDetail
   * @request GET:/api/v{version}/Withdrawal/settings/current
   * @secure
   */
  vWithdrawalSettingsCurrentDetail = (version: string, params: RequestParams = {}) =>
    this.request<WithdrawalSettingsRes, any>({
      path: `/api/v${version}/Withdrawal/settings/current`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });
  /**
   * HAND-ADDED (zinc withdrawal-policy PR) pending swagger regeneration —
   * set the withdrawal-method policy (admin).
   *
   * @tags Withdrawal
   * @name VWithdrawalSettingsCreate
   * @request POST:/api/v{version}/Withdrawal/settings
   * @secure
   */
  vWithdrawalSettingsCreate = (version: string, data: SetWithdrawalSettingsReq, params: RequestParams = {}) =>
    this.request<WithdrawalSettingsRes, any>({
      path: `/api/v${version}/Withdrawal/settings`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });
}
