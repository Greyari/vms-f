export type MasterEntityKey =
  | "visitors"
  | "blacklist"
  | "cards"
  | "vehicle_cards"
  | "staffs"
  | "locations"

export interface ExportColumnDef {
  key: string
  labelId: string
  labelEn: string
  defaultSelected?: boolean
}

export interface DateFieldDef {
  field: string
  labelId: string
  labelEn: string
}

export interface ImportColumnDef {
  key: string
  label: string
  required?: boolean
  render?: (row: Record<string, unknown>) => React.ReactNode
}

export interface MasterEntityConfig {
  key: MasterEntityKey
  titleId: string
  titleEn: string
  descriptionId: string
  descriptionEn: string
  templateEndpoint: string
  templateFileName: string
  previewEndpoint: string
  importEndpoint: string
  exportEndpoint: string
  exportCountEndpoint: string
  exportColumns: ExportColumnDef[]
  importColumns: ImportColumnDef[]
  defaultDateField: string
  dateFields?: DateFieldDef[]
}

export const MASTER_ENTITIES: Record<MasterEntityKey, MasterEntityConfig> = {
  visitors: {
    key: "visitors",
    titleId: "Master Pengunjung",
    titleEn: "Visitors",
    descriptionId: "Kelola data induk pengunjung, kontraktor, dan tamu galangan.",
    descriptionEn: "Manage master records for shipyard visitors, contractors, and guests.",
    templateEndpoint: "/visitors/template",
    templateFileName: "template_pengunjung.xlsx",
    previewEndpoint: "/visitors/import-preview",
    importEndpoint: "/visitors/import",
    exportEndpoint: "/visitors/export",
    exportCountEndpoint: "/visitors/export-count",
    defaultDateField: "created_at",
    dateFields: [
      { field: "created_at", labelId: "Tanggal Registrasi", labelEn: "Registration Date" },
      { field: "updated_at", labelId: "Tanggal Diperbarui", labelEn: "Updated Date" },
      { field: "birth_date", labelId: "Tanggal Lahir", labelEn: "Birth Date" },
    ],
    importColumns: [
      { key: "name", label: "Nama Lengkap", required: true },
      { key: "id_type", label: "Tipe Identitas (KTP/Passport/SIM)", required: true },
      { key: "id_number", label: "Nomor Identitas", required: true },
      { key: "visitor_type", label: "Tipe Pengunjung" },
      { key: "company", label: "Perusahaan / Instansi" },
      { key: "phone", label: "Nomor Telepon" },
      { key: "email", label: "Email" },
      { key: "occupation", label: "Jabatan / Profesi" },
      { key: "gender", label: "Jenis Kelamin (male/female)" },
      { key: "birth_place", label: "Tempat Lahir" },
      { key: "birth_date", label: "Tanggal Lahir (YYYY-MM-DD)" },
      { key: "nationality", label: "Kewarganegaraan" },
      { key: "address", label: "Alamat Domisili" },
    ],
    exportColumns: [
      { key: "visitor_no", labelId: "No. Pengunjung", labelEn: "Visitor No", defaultSelected: true },
      { key: "name", labelId: "Nama Lengkap", labelEn: "Name", defaultSelected: true },
      { key: "id_type", labelId: "Tipe Identitas", labelEn: "ID Type", defaultSelected: true },
      { key: "id_number", labelId: "Nomor Identitas", labelEn: "ID Number", defaultSelected: true },
      { key: "visitor_type", labelId: "Tipe Pengunjung", labelEn: "Visitor Type", defaultSelected: true },
      { key: "company", labelId: "Perusahaan", labelEn: "Company", defaultSelected: true },
      { key: "occupation", labelId: "Jabatan", labelEn: "Occupation", defaultSelected: true },
      { key: "gender", labelId: "Jenis Kelamin", labelEn: "Gender", defaultSelected: true },
      { key: "birth_date", labelId: "Tanggal Lahir", labelEn: "Birth Date", defaultSelected: true },
      { key: "phone", labelId: "No. Telepon", labelEn: "Phone", defaultSelected: true },
      { key: "email", labelId: "Email", labelEn: "Email", defaultSelected: true },
      { key: "address", labelId: "Alamat Domisili", labelEn: "Address", defaultSelected: true },
      { key: "vessel", labelId: "Kapal", labelEn: "Vessel", defaultSelected: false },
      { key: "certificate", labelId: "Sertifikat", labelEn: "Certificate", defaultSelected: false },
      { key: "certificate_no", labelId: "No. Sertifikat", labelEn: "Certificate No", defaultSelected: false },
      { key: "seaman_book_no", labelId: "No. Buku Pelaut", labelEn: "Seaman Book No", defaultSelected: false },
      { key: "created_at", labelId: "Dibuat Pada", labelEn: "Created At", defaultSelected: true },
      { key: "updated_at", labelId: "Diperbarui Pada", labelEn: "Updated At", defaultSelected: false },
    ],
  },

  blacklist: {
    key: "blacklist",
    titleId: "Daftar Blacklist",
    titleEn: "Blacklist",
    descriptionId: "Kelola daftar pencekalan pengunjung bermasalah.",
    descriptionEn: "Manage blacklisted visitors barred from entering the shipyard.",
    templateEndpoint: "/visitors/blacklisted/template",
    templateFileName: "template_blacklist.xlsx",
    previewEndpoint: "/visitors/blacklisted/import-preview",
    importEndpoint: "/visitors/blacklisted/import",
    exportEndpoint: "/visitors/blacklisted/export",
    exportCountEndpoint: "/visitors/blacklisted/export-count",
    defaultDateField: "blacklisted_at",
    dateFields: [
      { field: "blacklisted_at", labelId: "Tanggal Blacklist (DATE)", labelEn: "Blacklist Date (DATE)" },
      { field: "created_at", labelId: "Dibuat Pada", labelEn: "Created At" },
    ],
    importColumns: [
      { key: "name_of_offender", label: "NAME OF OFFENDER", required: true },
      { key: "badge_/_h.i.d_code", label: "Badge / H.I.D code" },
      { key: "ktp_no", label: "KTP NO" },
      { key: "offences", label: "OFFENCES", required: true },
      { key: "date", label: "DATE", required: true },
      { key: "remark", label: "REMARK" },
      { key: "company_name", label: "COMPANY NAME" },
    ],
    exportColumns: [
      { key: "no", labelId: "NO", labelEn: "NO", defaultSelected: true },
      { key: "name", labelId: "NAME OF OFFENDER", labelEn: "NAME OF OFFENDER", defaultSelected: true },
      { key: "badge_code", labelId: "Badge / H.I.D code", labelEn: "Badge / H.I.D code", defaultSelected: true },
      { key: "id_number", labelId: "KTP NO", labelEn: "KTP NO", defaultSelected: true },
      { key: "offences", labelId: "OFFENCES", labelEn: "OFFENCES", defaultSelected: true },
      { key: "date", labelId: "DATE", labelEn: "DATE", defaultSelected: true },
      { key: "remark", labelId: "REMARK", labelEn: "REMARK", defaultSelected: true },
      { key: "company", labelId: "COMPANY NAME", labelEn: "COMPANY NAME", defaultSelected: true },
      { key: "created_at", labelId: "Dibuat Pada", labelEn: "Created At", defaultSelected: false },
    ],
  },

  cards: {
    key: "cards",
    titleId: "Kartu Pengunjung",
    titleEn: "Visitor Cards",
    descriptionId: "Kelola inventaris kartu fisik akses pengunjung.",
    descriptionEn: "Manage visitor physical access card inventory.",
    templateEndpoint: "/cards/template",
    templateFileName: "template_cards.xlsx",
    previewEndpoint: "/cards/import-preview",
    importEndpoint: "/cards/import",
    exportEndpoint: "/cards/export",
    exportCountEndpoint: "/cards/export-count",
    defaultDateField: "created_at",
    dateFields: [
      { field: "created_at", labelId: "Tanggal Dibuat", labelEn: "Created At" },
      { field: "updated_at", labelId: "Tanggal Diperbarui", labelEn: "Updated At" },
    ],
    importColumns: [
      { key: "card_no", label: "Nomor Kartu", required: true },
      { key: "absenteeism_no", label: "Nomor Absensi" },
      { key: "card_type", label: "Tipe Kartu (regular/vip/contractor/vehicle/crew/special)" },
      { key: "note", label: "Catatan" },
    ],
    exportColumns: [
      { key: "card_no", labelId: "Nomor Kartu", labelEn: "Card No", defaultSelected: true },
      { key: "absenteeism_no", labelId: "No. Absensi", labelEn: "Absenteeism No", defaultSelected: true },
      { key: "card_type", labelId: "Tipe Kartu", labelEn: "Card Type", defaultSelected: true },
      { key: "note", labelId: "Catatan", labelEn: "Note", defaultSelected: true },
      { key: "is_active", labelId: "Status Aktif", labelEn: "Active", defaultSelected: true },
      { key: "status", labelId: "Status", labelEn: "Status", defaultSelected: true },
      { key: "created_at", labelId: "Dibuat Pada", labelEn: "Created At", defaultSelected: true },
      { key: "updated_at", labelId: "Diperbarui Pada", labelEn: "Updated At", defaultSelected: false },
    ],
  },

  vehicle_cards: {
    key: "vehicle_cards",
    titleId: "Kartu Kendaraan",
    titleEn: "Vehicle Cards",
    descriptionId: "Kelola inventaris kartu pas kendaraan pengunjung.",
    descriptionEn: "Manage vehicle pass card inventory.",
    templateEndpoint: "/vehicle-cards/template",
    templateFileName: "template_vehicle_cards.xlsx",
    previewEndpoint: "/vehicle-cards/import-preview",
    importEndpoint: "/vehicle-cards/import",
    exportEndpoint: "/vehicle-cards/export",
    exportCountEndpoint: "/vehicle-cards/export-count",
    defaultDateField: "created_at",
    dateFields: [
      { field: "created_at", labelId: "Tanggal Dibuat", labelEn: "Created At" },
      { field: "updated_at", labelId: "Tanggal Diperbarui", labelEn: "Updated At" },
    ],
    importColumns: [
      { key: "card_no", label: "Nomor Kartu", required: true },
      { key: "note", label: "Catatan" },
    ],
    exportColumns: [
      { key: "card_no", labelId: "Nomor Kartu", labelEn: "Card No", defaultSelected: true },
      { key: "status", labelId: "Status", labelEn: "Status", defaultSelected: true },
      { key: "created_at", labelId: "Dibuat Pada", labelEn: "Created At", defaultSelected: true },
      { key: "updated_at", labelId: "Diperbarui Pada", labelEn: "Updated At", defaultSelected: false },
    ],
  },

  staffs: {
    key: "staffs",
    titleId: "Master Staf",
    titleEn: "Staffs",
    descriptionId: "Kelola daftar staf dan penanggung jawab di galangan.",
    descriptionEn: "Manage shipyard personnel, departments, and hosts.",
    templateEndpoint: "/staffs/template",
    templateFileName: "template_staff.xlsx",
    previewEndpoint: "/staffs/import-preview",
    importEndpoint: "/staffs/import",
    exportEndpoint: "/staffs/export",
    exportCountEndpoint: "/staffs/export-count",
    defaultDateField: "created_at",
    dateFields: [
      { field: "created_at", labelId: "Tanggal Dibuat", labelEn: "Created At" },
      { field: "updated_at", labelId: "Tanggal Diperbarui", labelEn: "Updated At" },
    ],
    importColumns: [
      { key: "staff_id", label: "Staff ID / NIK", required: true },
      { key: "name", label: "Nama Lengkap", required: true },
      { key: "department", label: "Departemen" },
      { key: "company", label: "Perusahaan" },
      { key: "occupation", label: "Jabatan" },
      { key: "gender", label: "Gender" },
    ],
    exportColumns: [
      { key: "staff_id", labelId: "Staff ID / NIK", labelEn: "Staff ID", defaultSelected: true },
      { key: "name", labelId: "Nama Staf", labelEn: "Name", defaultSelected: true },
      { key: "department", labelId: "Departemen", labelEn: "Department", defaultSelected: true },
      { key: "company", labelId: "Perusahaan", labelEn: "Company", defaultSelected: true },
      { key: "occupation", labelId: "Jabatan", labelEn: "Occupation", defaultSelected: true },
      { key: "status", labelId: "Status", labelEn: "Status", defaultSelected: true },
      { key: "gender", labelId: "Jenis Kelamin", labelEn: "Gender", defaultSelected: true },
      { key: "birth_date", labelId: "Tanggal Lahir", labelEn: "Birth Date", defaultSelected: true },
      { key: "address", labelId: "Alamat", labelEn: "Address", defaultSelected: true },
      { key: "created_at", labelId: "Dibuat Pada", labelEn: "Created At", defaultSelected: true },
      { key: "updated_at", labelId: "Diperbarui Pada", labelEn: "Updated At", defaultSelected: false },
    ],
  },

  locations: {
    key: "locations",
    titleId: "Lokasi & Kapal",
    titleEn: "Locations & Vessels",
    descriptionId: "Kelola master lokasi pos galangan dan daftar kapal.",
    descriptionEn: "Manage shipyard post locations and vessel master records.",
    templateEndpoint: "/locations/template",
    templateFileName: "template_locations.xlsx",
    previewEndpoint: "/locations/import-preview",
    importEndpoint: "/locations/import",
    exportEndpoint: "/locations/export",
    exportCountEndpoint: "/locations/export-count",
    defaultDateField: "created_at",
    dateFields: [
      { field: "created_at", labelId: "Tanggal Dibuat", labelEn: "Created At" },
      { field: "updated_at", labelId: "Tanggal Diperbarui", labelEn: "Updated At" },
    ],
    importColumns: [
      { key: "name", label: "Nama Lokasi / Kapal", required: true },
      { key: "code", label: "Kode / IMO" },
      { key: "type", label: "Tipe (location/vessel)", required: true },
      { key: "pic", label: "PIC" },
    ],
    exportColumns: [
      { key: "name", labelId: "Nama Lokasi / Kapal", labelEn: "Name", defaultSelected: true },
      { key: "code", labelId: "Kode / IMO", labelEn: "Code / IMO", defaultSelected: true },
      { key: "type", labelId: "Tipe", labelEn: "Type", defaultSelected: true },
      { key: "pic", labelId: "Penanggung Jawab (PIC)", labelEn: "PIC", defaultSelected: true },
      { key: "call_sign", labelId: "Call Sign", labelEn: "Call Sign", defaultSelected: false },
      { key: "flag", labelId: "Bendera", labelEn: "Flag", defaultSelected: false },
      { key: "port", labelId: "Pelabuhan Asal", labelEn: "Port", defaultSelected: false },
      { key: "captain", labelId: "Kapten", labelEn: "Captain", defaultSelected: false },
      { key: "local_agent_company", labelId: "Perusahaan Agen", labelEn: "Agent Company", defaultSelected: false },
      { key: "local_agent_name", labelId: "PIC Agen", labelEn: "Agent PIC", defaultSelected: false },
      { key: "local_agent_phone", labelId: "Telepon Agen", labelEn: "Agent Phone", defaultSelected: false },
      { key: "created_at", labelId: "Dibuat Pada", labelEn: "Created At", defaultSelected: true },
      { key: "updated_at", labelId: "Diperbarui Pada", labelEn: "Updated At", defaultSelected: false },
    ],
  },
}
