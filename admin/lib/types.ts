export type Country = {
  id: string;
  name: string;
  isServiceAvailable: boolean;
};

export type AdminProfile = {
  id: string;
  name: string;
  username: string;
  email: string;
  appConfigId: string | null;
  authprovider: string;
  profilepic: string | null;
};

export type Stats = {
  users: number;
  states: number;
  districts: number;
  places: number;
  pendingPlaceSubmissions: number;
  specificGuides: number;
  commonGuides: number;
  guides: number;
  hotels: number;
  restaurants: number;
  hotelBookings: number;
  restaurantReservations: number;
  guideBookings: number;
};

export type AppSettings = {
  id: string;
  app_name: string;
  imageBanners: string[];
  icon: string;
  webTitle: string;
  text: string;
  contacts: string;
  termsandconditions: string;
  privacy: string;
  app_description: string;
};

export type StateAdmin = {
  id: string;
  name: string;
  countryId: string;
  isServiceAvailable: boolean;
  country: Country;
  _count: { districts: number };
};

export type StateAdminDetail = StateAdmin & {
  districts: (DistrictAdmin & { _count?: { places: number } })[];
};

export type DistrictAdmin = {
  id: string;
  name: string;
  stateId: string;
  isServiceAvailable: boolean;
  autoApprovePlaces?: boolean;
  createdAt?: string;
  state: StateAdmin & {
    country: Country;
  };
  _count: { places: number; hotels: number; restaurent: number };
};

export type ContentApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export type PlaceAdmin = {
  id: string;
  name: string;
  description: string;
  districtId: string;
  images: string[];
  entryfee: number;
  category: string;
  status?: ContentApprovalStatus;
  latitude: number;
  longitude: number;
  createdAt: string;
  updatedAt: string;
  district?: DistrictAdmin;
  _count?: {
    specificguide: number;
    commonGuidePlaces: number;
    user_fav_place: number;
  };
};

export type PlaceAdminDetail = PlaceAdmin & {
  district?: DistrictAdmin;
  specificguide?: GuideAdmin[];
  commonGuidePlaces?: { commonGuide: GuideAdmin }[];
  placeSubmissions?: PlaceSubmission[];
};

export type GuideAdmin = {
  id: string;
  full_name: string;
  username: string;
  email: string;
  phonenumber: string;
  profile_pic: string | null;
  tagline: string | null;
  authprovider: string;
  rating: number | null;
  description: string | null;
  isReported: boolean;
  experience: number | null;
  cost: number | null;
  language: string | null;
  createdAt: string;
  updatedAt: string;
  place?: { id: string; name: string; images: string[]; district?: { id: string; name: string } };
  places?: { place: { id: string; name: string; images: string[]; district?: { id: string; name: string } } }[];
  review?: string[];
  _count?: { bookings: number; placeSubmissions: number };
};

export type OwnerAdmin = {
  id: string;
  name: string;
  username: string;
  email: string;
  phone_number: string;
  profile_pic: string | null;
  createdAt: string;
  updatedAt: string;
  hotels?: { id: string; name: string; districtId: string }[];
  restaurents?: { id: string; name: string; districtId: string }[];
};

export type HotelAdmin = {
  id: string;
  name: string;
  address: string;
  profile_logo: string | null;
  districtId: string;
  description: string | null;
  rating: number | null;
  cost_per_night: number;
  images: string[];
  phone_number: string | null;
  whatsapp_number: string | null;
  email: string | null;
  website: string | null;
  booking_enabled: boolean;
  status?: ContentApprovalStatus;
  createdAt: string;
  updatedAt: string;
  district?: DistrictAdmin;
  hotelOwner?: OwnerAdmin;
  _count?: { bookings: number };
};

export type RestaurantAdmin = {
  id: string;
  name: string;
  address: string;
  districtId: string;
  description: string | null;
  rating: number | null;
  menu: string[];
  food_category: string;
  images: string[];
  profile_logo: string | null;
  phone_number: string | null;
  whatsapp_number: string | null;
  email: string | null;
  website: string | null;
  booking_enabled: boolean;
  status?: ContentApprovalStatus;
  createdAt: string;
  updatedAt: string;
  district?: DistrictAdmin;
  restaurentOwner?: OwnerAdmin;
  _count?: { reservations: number };
};

export type UserAdmin = {
  id: string;
  name: string;
  username: string;
  email: string;
  phonenumber: string | null;
  profilepic: string | null;
  authprovider: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    hotel_booking: number;
    restaurant_reservation: number;
    specificGuideBookings: number;
    commonGuideBookings: number;
    user_fav_place: number;
    testimonials: number;
  };
};

export type UserAdminDetail = UserAdmin & {
  user_fav_place?: { place: PlaceAdmin & { district?: { id: string; name: string } } }[];
  hotel_booking?: (HotelBooking & { hotel?: HotelAdmin })[];
  restaurant_reservation?: (Reservation & { restaurent?: RestaurantAdmin })[];
  specificGuideBookings?: (SpecificGuideBooking & { specificGuide?: GuideAdmin })[];
  commonGuideBookings?: (CommonGuideBooking & { commonGuide?: GuideAdmin })[];
};

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

export type SpecificGuideBooking = {
  id: string;
  userId: string;
  specificGuideId: string;
  placeId: string;
  bookingDate: string;
  bookingTime?: string | null;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  user?: UserAdmin;
  specificGuide?: GuideAdmin;
  place?: PlaceAdmin;
};

export type CommonGuideBooking = {
  id: string;
  userId: string;
  commonGuideId: string;
  bookingDate: string;
  bookingTime?: string | null;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  user?: UserAdmin;
  commonGuide?: GuideAdmin;
  selectedPlaces?: { place: PlaceAdmin }[];
};

export type HotelBooking = {
  id: string;
  hotelId: string;
  userId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  totalAmount: number;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  hotel?: HotelAdmin;
  user?: UserAdmin;
};

export type Reservation = {
  id: string;
  restaurantId: string;
  userId: string;
  reservationDate: string;
  guests: number;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  restaurent?: RestaurantAdmin;
  user?: UserAdmin;
};

export type PlaceSubmission = {
  id: string;
  placeId: string | null;
  name: string;
  description: string;
  districtId: string;
  images: string[];
  entryfee: number;
  category: string;
  latitude: number;
  longitude: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  specificGuideId?: string | null;
  commonGuideId?: string | null;
  createdAt: string;
  updatedAt: string;
  district?: { id: string; name: string; state?: { id: string; name: string } };
  place?: PlaceAdmin | null;
  specificGuide?: GuideAdmin | null;
  commonGuide?: GuideAdmin | null;
};

export type Testimonial = {
  id: string;
  userId: string;
  appConfigId: string;
  text: string;
  image: string | null;
  rating: number;
  user?: UserAdmin;
  specificguide?: { id: string; full_name: string } | null;
  commonGuide?: { id: string; full_name: string } | null;
};

export type ListResponse<T> = {
  [key: string]: T[];
};

export type SearchParams = Record<string, string | string[] | undefined>;