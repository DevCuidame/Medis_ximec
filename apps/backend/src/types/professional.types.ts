export type ProfessionalStatus = 'available' | 'in_session' | 'offline'

// ─── DB row shape ─────────────────────────────────────────────────────────────
export interface ProfessionalRecord {
  id:                string
  email:             string
  first_name:        string
  second_name:         string | null
  second_last_name:    string | null
  last_name:         string
  phone:             string | null
  role:              string
  id_type:           string | null
  id_number:         string | null
  address:              string | null
  professional_license: string | null
  sispro_user:          string | null
  sispro_password_enc:  string | null
  bio:               string | null
  specialties:       string[] | null
  instagram_url:     string | null
  avatar_url:        string | null
  status:            ProfessionalStatus
  is_active:         boolean
  is_verified:       boolean
  professional_type: 'dependiente' | 'independiente'
  created_at:        Date
  updated_at:        Date
  // joined from rating summary
  avg_score:     string | null
  total_reviews: string | null
}

// ─── API response shape ───────────────────────────────────────────────────────
export interface ProfessionalPublic {
  id:               string
  email:            string
  firstName:        string
  lastName:         string
  secondName:          string | null
  secondLastName:      string | null
  idType:           string | null
  idNumber:         string | null
  professionalLicense: string | null
  phone:            string | null
  bio:              string | null
  specialties:      string[]
  instagramUrl:     string | null
  avatarUrl:        string | null
  status:           ProfessionalStatus
  isActive:         boolean
  isVerified:       boolean
  professionalType: 'dependiente' | 'independiente'
  avgScore:         number
  totalReviews:     number
  createdAt:        string
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export interface CreateProfessionalDTO {
  email:            string
  password:         string
  role?:               'PROFESSIONAL' | 'ADMIN'
  firstName:        string
  secondName?:         string
  lastName:         string
  secondLastName?:     string
  idType?:          string
  idNumber?:        string
  phone?:           string
  address?:            string
  bio?:             string
  specialties?:     string[]
  instagramUrl?:    string
  avatarUrl?:       string
  professionalType?: 'dependiente' | 'independiente'
  professionalLicense?: string
  sisproUser?:         string
  sisproPassword?:     string
}

export interface UpdateProfessionalDTO {
  firstName?:   string
  lastName?:    string
  secondName?:         string
  secondLastName?:     string
  idType?:      string
  idNumber?:    string
  phone?:       string
  address?:            string
  bio?:         string
  specialties?: string[]
  instagramUrl?: string
  avatarUrl?:   string
  isActive?:    boolean
  isVerified?:  boolean
  professionalLicense?: string
  sisproUser?:         string
  sisproPassword?:     string
  professionalType?: 'dependiente' | 'independiente'
}

export interface ProfessionalAdminDetails {
  address:        string | null
  sisproUser:     string | null
  sisproPassword: string | null
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export interface ProfessionalStats {
  totalProfessionals:  number
  activeProfessionals: number
  avgSatisfaction:     number
  weeklyBookings:      number
  totalDisciplines:    number
}
