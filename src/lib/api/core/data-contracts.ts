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

export interface AirwallexEvent {
  id?: string | null;
  name?: string | null;
  account_id?: string | null;
  accountId?: string | null;
  data: AirwallexEventData;
  created_at?: string | null;
  createdAt?: string | null;
  sourceId?: string | null;
}

export interface AirwallexEventData {
  object: AirwallexEventDataObject;
}

export interface AirwallexEventDataObject {
  /** @format double */
  amount: number;
  /** @format double */
  base_amount: number;
  base_currency?: string | null;
  /** @format double */
  captured_amount: number;
  created_at?: string | null;
  currency?: string | null;
  descriptor?: string | null;
  id?: string | null;
  /** @format uuid */
  merchant_order_id: string;
  /** @format uuid */
  request_id: string;
  status?: string | null;
  updated_at?: string | null;
}

export interface BookingCountRes {
  date?: string | null;
  time?: string | null;
  direction?: string | null;
  /** @format int32 */
  ticketsNeeded: number;
}

export interface BookingPassengerReq {
  fullName?: string | null;
  gender?: string | null;
  passportExpiry?: string | null;
  passportNumber?: string | null;
}

export interface BookingPassengerRes {
  fullName?: string | null;
  gender?: string | null;
  passportExpiry?: string | null;
  passportNumber?: string | null;
}

export interface BookingPrincipalRes {
  /** @format uuid */
  id: string;
  date?: string | null;
  time?: string | null;
  direction?: string | null;
  passenger: BookingPassengerRes;
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  completedAt?: string | null;
  ticketLink?: string | null;
  ticketNo?: string | null;
  bookingNo?: string | null;
  status?: string | null;
}

export interface BookingRes {
  principal: BookingPrincipalRes;
  user: UserPrincipalRes;
}

export interface CancelWithdrawalReq {
  note?: string | null;
}

export interface CostPrincipalRes {
  /** @format uuid */
  id: string;
  /** @format date-time */
  createdAt: string;
  /** @format double */
  cost: number;
}

export interface CreateBookingReq {
  date?: string | null;
  time?: string | null;
  direction?: string | null;
  passenger: BookingPassengerReq;
}

export interface CreateCostReq {
  /** @format double */
  cost: number;
}

export interface CreateDiscountReq {
  target: DiscountTargetReq;
  record: DiscountRecordReq;
}

export interface CreatePassengerReq {
  fullName?: string | null;
  gender?: string | null;
  passportExpiry?: string | null;
  passportNumber?: string | null;
}

export interface CreatePaymentReq {
  /** @format double */
  amount: number;
  currency?: string | null;
}

export interface CreatePaymentRes {
  /** @format uuid */
  id: string;
  externalReference?: string | null;
  gateway?: string | null;
  secret?: string | null;
  /** @format date-time */
  createdAt: string;
  statuses?: Record<string, string>;
  /** @format double */
  amount: number;
  currency?: string | null;
  status?: string | null;
  /** @format date-time */
  lastUpdated: string;
  additionalData?: any;
}

export interface CreateUserReq {
  username?: string | null;
}

export interface CreateWithdrawalReq {
  /** @format double */
  amount: number;
  payNowNumber?: string | null;
}

export interface DiscountMatchReq {
  value?: string | null;
  matchType?: string | null;
}

export interface DiscountMatchRes {
  value?: string | null;
  matchType?: string | null;
}

export interface DiscountPrincipalRes {
  /** @format uuid */
  id: string;
  record: DiscountRecordRes;
  status: DiscountStatusRes;
  target: DiscountTargetRes;
}

export interface DiscountRecordReq {
  name?: string | null;
  description?: string | null;
  /** @format double */
  amount: number;
  type?: string | null;
}

export interface DiscountRecordRes {
  name?: string | null;
  description?: string | null;
  /** @format double */
  amount: number;
  type?: string | null;
}

export interface DiscountStatusReq {
  disabled: boolean;
}

export interface DiscountStatusRes {
  disabled: boolean;
}

export interface DiscountTargetReq {
  matchMode?: string | null;
  matches?: DiscountMatchReq[] | null;
}

export interface DiscountTargetRes {
  matchMode?: string | null;
  matches?: DiscountMatchRes[] | null;
}

export interface ErrorInfo {
  schema?: any;
  id?: string | null;
  title?: string | null;
  version?: string | null;
}

export interface LatestScheduleRes {
  date?: string | null;
}

export interface MaterializedCostRes {
  /** @format double */
  cost: number;
  /** @format double */
  final: number;
  discounts?: DiscountRecordRes[] | null;
}

export interface PassengerPrincipalRes {
  /** @format uuid */
  id: string;
  fullName?: string | null;
  gender?: string | null;
  passportExpiry?: string | null;
  passportNumber?: string | null;
}

export interface PassengerRes {
  principal: PassengerPrincipalRes;
  user: UserPrincipalRes;
}

export interface PaymentPrincipalRes {
  /** @format uuid */
  id: string;
  externalReference?: string | null;
  gateway?: string | null;
  /** @format date-time */
  createdAt: string;
  statuses?: Record<string, string>;
  /** @format double */
  amount: number;
  /** @format double */
  capturedAmount: number;
  currency?: string | null;
  status?: string | null;
  /** @format date-time */
  lastUpdated: string;
  additionalData?: any;
}

export interface PaymentRes {
  principal: PaymentPrincipalRes;
  wallet: WalletPrincipalRes;
  transaction: TransactionPrincipalRes;
}

export interface RejectWithdrawalReq {
  note?: string | null;
}

export interface ScheduleBulkUpdateReq {
  schedules?: SchedulePrincipalReq[] | null;
}

export interface SchedulePrincipalReq {
  date?: string | null;
  record: ScheduleRecordReq;
}

export interface SchedulePrincipalRes {
  date?: string | null;
  confirmed: boolean;
  jToWExcluded?: string[] | null;
  wToJExcluded?: string[] | null;
}

export interface ScheduleRecordReq {
  confirmed: boolean;
  jToWExcluded?: string[] | null;
  wToJExcluded?: string[] | null;
}

export interface TimingPrincipalRes {
  direction?: string | null;
  timings?: string[] | null;
}

export interface TimingReq {
  timings?: string[] | null;
}

export interface TimingRes {
  principal: TimingPrincipalRes;
}

export interface TransactionPrincipalRes {
  /** @format uuid */
  id: string;
  /** @format date-time */
  createdAt: string;
  name?: string | null;
  description?: string | null;
  transactionType?: string | null;
  /** @format double */
  amount: number;
  from?: string | null;
  to?: string | null;
}

export interface TransactionRes {
  principal: TransactionPrincipalRes;
  wallet: WalletPrincipalRes;
}

export interface TransferReq {
  /** @format double */
  amount: number;
  desc?: string | null;
}

export interface UpdateDiscountReq {
  target: DiscountTargetReq;
  record: DiscountRecordReq;
  status: DiscountStatusReq;
}

export interface UpdatePassengerReq {
  fullName?: string | null;
  gender?: string | null;
  passportExpiry?: string | null;
  passportNumber?: string | null;
}

export interface UpdateUserReq {
  username?: string | null;
}

export interface UserExistRes {
  exists: boolean;
}

export interface UserPrincipalRes {
  id?: string | null;
  username?: string | null;
}

export interface UserRes {
  principal: UserPrincipalRes;
  wallet: WalletPrincipalRes;
}

export interface WalletPrincipalRes {
  /** @format uuid */
  id: string;
  userId?: string | null;
  /** @format double */
  usable: number;
  /** @format double */
  withdrawReserve: number;
  /** @format double */
  bookingReserve: number;
}

export interface WalletRes {
  principal: WalletPrincipalRes;
  user: UserPrincipalRes;
}

export interface WithdrawalCompleteRes {
  /** @format date-time */
  completedAt: string;
  note?: string | null;
  receipt?: string | null;
}

export interface WithdrawalPrincipalRes {
  /** @format uuid */
  id: string;
  /** @format date-time */
  createAt: string;
  status: WithdrawalStatusRes;
  record: WithdrawalRecordRes;
  complete: WithdrawalCompleteRes;
}

export interface WithdrawalRecordRes {
  /** @format double */
  amount: number;
  payNowNumber?: string | null;
}

export interface WithdrawalRes {
  principal: WithdrawalPrincipalRes;
  user: UserPrincipalRes;
  completer: UserPrincipalRes;
  wallet: WalletPrincipalRes;
}

export interface WithdrawalStatusRes {
  status?: string | null;
}
