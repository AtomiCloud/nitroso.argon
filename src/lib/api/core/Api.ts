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
  BookingCountRes,
  BookingPrincipalRes,
  BookingRes,
  CancelWithdrawalReq,
  CostPrincipalRes,
  CreateBookingReq,
  CreateCostReq,
  CreateDiscountReq,
  CreatePassengerReq,
  CreatePaymentReq,
  CreatePaymentRes,
  CreateUserReq,
  CreateWithdrawalReq,
  DiscountPrincipalRes,
  ErrorInfo,
  LatestScheduleRes,
  MaterializedCostRes,
  PassengerPrincipalRes,
  PassengerRes,
  PaymentPrincipalRes,
  PaymentRes,
  RejectWithdrawalReq,
  ScheduleBulkUpdateReq,
  SchedulePrincipalRes,
  ScheduleRecordReq,
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
} from "./data-contracts";
import { ContentType, HttpClient, type RequestParams } from "./http-client";

export class Api<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * No description
   *
   * @tags Admin
   * @name VAdminInflowCreate
   * @request POST:/api/v{version}/Admin/inflow/{userId}
   * @secure
   */
  vAdminInflowCreate = (
    userId: string,
    version: string,
    data: TransferReq,
    params: RequestParams = {},
  ) =>
    this.request<WalletPrincipalRes, any>({
      path: `/api/v${version}/Admin/inflow/${userId}`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
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
  vAdminOutflowCreate = (
    userId: string,
    version: string,
    data: TransferReq,
    params: RequestParams = {},
  ) =>
    this.request<WalletPrincipalRes, any>({
      path: `/api/v${version}/Admin/outflow/${userId}`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
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
  vAdminPromoCreate = (
    userId: string,
    version: string,
    data: TransferReq,
    params: RequestParams = {},
  ) =>
    this.request<WalletPrincipalRes, any>({
      path: `/api/v${version}/Admin/promo/${userId}`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
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
      /** @format int32 */
      Limit?: number;
      /** @format int32 */
      Skip?: number;
    },
    params: RequestParams = {},
  ) =>
    this.request<BookingPrincipalRes[], any>({
      path: `/api/v${version}/Booking`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
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
      method: "GET",
      secure: true,
      format: "json",
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
      method: "GET",
      secure: true,
      format: "json",
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
      method: "GET",
      query: query,
      secure: true,
      format: "json",
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
      method: "POST",
      query: query,
      body: data,
      secure: true,
      type: ContentType.FormData,
      format: "json",
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
      method: "GET",
      secure: true,
      format: "json",
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
  vBookingCountsDetail2 = (
    date: string,
    direction: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<BookingCountRes[], any>({
      path: `/api/v${version}/Booking/counts/${direction}/${date}`,
      method: "GET",
      secure: true,
      format: "json",
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
  vBookingBuyingCreate = (
    id: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<BookingPrincipalRes, any>({
      path: `/api/v${version}/Booking/buying/${id}`,
      method: "POST",
      secure: true,
      format: "json",
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
  vBookingRefundCreate = (
    id: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<BookingPrincipalRes, any>({
      path: `/api/v${version}/Booking/refund/${id}`,
      method: "POST",
      secure: true,
      format: "json",
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
  vBookingPurchaseCreate = (
    userId: string,
    version: string,
    data: CreateBookingReq,
    params: RequestParams = {},
  ) =>
    this.request<BookingPrincipalRes, any>({
      path: `/api/v${version}/Booking/${userId}/purchase`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
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
      method: "POST",
      query: query,
      secure: true,
      format: "json",
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
      method: "POST",
      query: query,
      secure: true,
      format: "json",
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
      method: "GET",
      secure: true,
      format: "json",
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
  vCostCreate = (
    version: string,
    data: CreateCostReq,
    params: RequestParams = {},
  ) =>
    this.request<CostPrincipalRes, any>({
      path: `/api/v${version}/Cost`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
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
      method: "GET",
      secure: true,
      format: "json",
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
      method: "GET",
      secure: true,
      format: "json",
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
      method: "GET",
      query: query,
      secure: true,
      format: "json",
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
  vDiscountCreate = (
    version: string,
    data: CreateDiscountReq,
    params: RequestParams = {},
  ) =>
    this.request<DiscountPrincipalRes, any>({
      path: `/api/v${version}/Discount`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
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
  vDiscountDetail2 = (
    id: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<DiscountPrincipalRes, any>({
      path: `/api/v${version}/Discount/${id}`,
      method: "GET",
      secure: true,
      format: "json",
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
  vDiscountUpdate = (
    id: string,
    version: string,
    data: UpdateDiscountReq,
    params: RequestParams = {},
  ) =>
    this.request<DiscountPrincipalRes, any>({
      path: `/api/v${version}/Discount/${id}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
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
      method: "DELETE",
      secure: true,
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
      method: "GET",
      query: query,
      secure: true,
      format: "json",
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
  vPassengerDetail2 = (
    userId: string,
    id: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<PassengerRes, any>({
      path: `/api/v${version}/Passenger/${userId}/${id}`,
      method: "GET",
      secure: true,
      format: "json",
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
  vPassengerCreate = (
    userId: string,
    version: string,
    data: CreatePassengerReq,
    params: RequestParams = {},
  ) =>
    this.request<PassengerPrincipalRes, any>({
      path: `/api/v${version}/Passenger/${userId}`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
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
      method: "PUT",
      query: query,
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
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
      method: "DELETE",
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
      method: "GET",
      query: query,
      secure: true,
      format: "json",
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
  vPaymentIdDetail = (
    id: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<PaymentRes, any>({
      path: `/api/v${version}/Payment/id/${id}`,
      method: "GET",
      secure: true,
      format: "json",
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
  vPaymentIdDelete = (
    id: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<PaymentRes, any>({
      path: `/api/v${version}/Payment/id/${id}`,
      method: "DELETE",
      secure: true,
      format: "json",
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
  vPaymentReferenceDetail = (
    reference: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<PaymentRes, any>({
      path: `/api/v${version}/Payment/reference/${reference}`,
      method: "GET",
      secure: true,
      format: "json",
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
  vPaymentReferenceDelete = (
    reference: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<PaymentRes, any>({
      path: `/api/v${version}/Payment/reference/${reference}`,
      method: "DELETE",
      secure: true,
      format: "json",
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
      method: "POST",
      query: query,
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
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
  vPaymentWebhookCreate = (
    version: string,
    data: AirwallexEvent,
    params: RequestParams = {},
  ) =>
    this.request<void, any>({
      path: `/api/v${version}/Payment/webhook`,
      method: "POST",
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
      method: "GET",
      secure: true,
      format: "json",
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
  vScheduleRangeDetail = (
    from: string,
    to: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<SchedulePrincipalRes[], any>({
      path: `/api/v${version}/Schedule/range/${from}/${to}`,
      method: "GET",
      secure: true,
      format: "json",
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
  vScheduleDetail = (
    date: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<SchedulePrincipalRes, any>({
      path: `/api/v${version}/Schedule/${date}`,
      method: "GET",
      secure: true,
      format: "json",
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
  vScheduleUpdate = (
    date: string,
    version: string,
    data: ScheduleRecordReq,
    params: RequestParams = {},
  ) =>
    this.request<SchedulePrincipalRes, any>({
      path: `/api/v${version}/Schedule/${date}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
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
  vScheduleDelete = (
    date: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<void, any>({
      path: `/api/v${version}/Schedule/${date}`,
      method: "DELETE",
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
  vScheduleBulkUpdate = (
    version: string,
    data: ScheduleBulkUpdateReq,
    params: RequestParams = {},
  ) =>
    this.request<void, any>({
      path: `/api/v${version}/Schedule/bulk`,
      method: "PUT",
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
  vTimingDetail = (
    direction: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<TimingRes, any>({
      path: `/api/v${version}/Timing/${direction}`,
      method: "GET",
      secure: true,
      format: "json",
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
  vTimingUpdate = (
    direction: string,
    version: string,
    data: TimingReq,
    params: RequestParams = {},
  ) =>
    this.request<TimingPrincipalRes, any>({
      path: `/api/v${version}/Timing/${direction}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
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
      method: "GET",
      query: query,
      secure: true,
      format: "json",
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
      method: "GET",
      query: query,
      secure: true,
      format: "json",
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
  vTransactionDelete = (
    id: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<TransactionRes, any>({
      path: `/api/v${version}/Transaction/${id}`,
      method: "DELETE",
      secure: true,
      format: "json",
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
      /** @format int32 */
      Limit?: number;
      /** @format int32 */
      Skip?: number;
    },
    params: RequestParams = {},
  ) =>
    this.request<UserPrincipalRes[], any>({
      path: `/api/v${version}/User`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
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
  vUserCreate = (
    version: string,
    data: CreateUserReq,
    params: RequestParams = {},
  ) =>
    this.request<UserPrincipalRes, any>({
      path: `/api/v${version}/User`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
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
      method: "GET",
      secure: true,
      format: "json",
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
      method: "GET",
      secure: true,
      format: "json",
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
      method: "GET",
      secure: true,
      format: "json",
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
  vUserUpdate = (
    id: string,
    version: string,
    data: UpdateUserReq,
    params: RequestParams = {},
  ) =>
    this.request<UserPrincipalRes, any>({
      path: `/api/v${version}/User/${id}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
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
      method: "DELETE",
      secure: true,
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
  vUserUsernameDetail = (
    username: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<UserRes, any>({
      path: `/api/v${version}/User/username/${username}`,
      method: "GET",
      secure: true,
      format: "json",
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
  vUserExistDetail = (
    username: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<UserExistRes, any>({
      path: `/api/v${version}/User/exist/${username}`,
      method: "GET",
      secure: true,
      format: "json",
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
      method: "GET",
      secure: true,
      format: "json",
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
  vErrorInfoDetail2 = (
    id: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<ErrorInfo, any>({
      path: `/api/v${version}/error-info/${id}`,
      method: "GET",
      secure: true,
      format: "json",
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
      method: "GET",
      query: query,
      secure: true,
      format: "json",
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
      method: "GET",
      query: query,
      secure: true,
      format: "json",
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
  vWalletUserDetail = (
    userId: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<WalletRes, any>({
      path: `/api/v${version}/Wallet/user/${userId}`,
      method: "GET",
      secure: true,
      format: "json",
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
      method: "GET",
      query: query,
      secure: true,
      format: "json",
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
      method: "GET",
      query: query,
      secure: true,
      format: "json",
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
  vWithdrawalDelete = (
    id: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<WithdrawalPrincipalRes, any>({
      path: `/api/v${version}/Withdrawal/${id}`,
      method: "DELETE",
      secure: true,
      format: "json",
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
  vWithdrawalCreate = (
    userId: string,
    version: string,
    data: CreateWithdrawalReq,
    params: RequestParams = {},
  ) =>
    this.request<WithdrawalPrincipalRes, any>({
      path: `/api/v${version}/Withdrawal/${userId}`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
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
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
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
  vWithdrawalRejectCreate = (
    id: string,
    version: string,
    data: RejectWithdrawalReq,
    params: RequestParams = {},
  ) =>
    this.request<WithdrawalPrincipalRes, any>({
      path: `/api/v${version}/Withdrawal/${id}/reject`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
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
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.FormData,
      format: "json",
      ...params,
    });
}
