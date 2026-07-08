# Requirements Document

## Introduction

Fitur Student Custom Data Sync memungkinkan admin untuk menyimpan dan mengelola data custom per siswa yang kemudian dapat digunakan untuk mengisi variabel custom dalam template surat secara otomatis. Saat ini, admin harus mengisi data variabel custom secara manual untuk setiap siswa ketika mengirim surat massal. Dengan fitur ini, sistem akan secara otomatis memetakan data custom siswa dengan variabel template, sehingga setiap siswa menerima surat dengan data mereka masing-masing yang sudah terisi otomatis.

## Glossary

- **Custom_Data_Manager**: Komponen sistem yang mengelola penyimpanan, pembaruan, dan penghapusan data custom siswa
- **Bulk_Import_Service**: Komponen yang memproses file CSV/Excel berisi data custom siswa dalam jumlah besar
- **Variable_Mapper**: Komponen yang memetakan variabel custom dalam template dengan data custom siswa
- **Letter_Generator**: Komponen yang menghasilkan surat dengan data yang sudah diisi dari template dan data siswa
- **Custom_Variable**: Variabel dinamis dalam template surat (contoh: {{tempat_lahir}}, {{tanggal_lahir}}, {{asal_sekolah}})
- **Student_Custom_Data**: Data tambahan spesifik per siswa yang tersimpan dalam format JSON
- **Bulk_Generation**: Proses pembuatan surat untuk banyak siswa sekaligus
- **Admin**: Pengguna dengan role ADMIN atau STAFF yang memiliki akses penuh ke sistem

## Requirements

### Requirement 1: Menyimpan Data Custom Per Siswa

**User Story:** Sebagai admin, saya ingin menyimpan data custom untuk setiap siswa, sehingga data tersebut dapat digunakan untuk mengisi variabel dalam template surat.

#### Acceptance Criteria

1. WHEN admin menambahkan atau memperbarui data custom siswa, THE Custom_Data_Manager SHALL menyimpan data tersebut dalam format JSON di field extraData pada record siswa
2. THE Custom_Data_Manager SHALL memvalidasi bahwa key dari setiap data custom adalah string yang valid
3. WHEN data custom dengan key yang sudah ada diperbarui, THE Custom_Data_Manager SHALL menimpa nilai lama dengan nilai baru
4. THE Custom_Data_Manager SHALL menyimpan data custom dengan tipe data yang bervariasi (string, number, boolean, date)
5. WHEN siswa belum memiliki data custom, THE Custom_Data_Manager SHALL menginisialisasi field extraData sebagai objek JSON kosong

### Requirement 2: Import Data Custom Secara Bulk

**User Story:** Sebagai admin, saya ingin mengimpor data custom untuk banyak siswa sekaligus dari file CSV/Excel, sehingga saya tidak perlu memasukkan data satu per satu.

#### Acceptance Criteria

1. WHEN admin mengupload file CSV atau Excel yang berisi NISN dan kolom data custom, THE Bulk_Import_Service SHALL memproses file tersebut
2. THE Bulk_Import_Service SHALL mencocokkan setiap baris data dengan siswa berdasarkan kolom NISN
3. IF NISN dalam file tidak ditemukan di database, THEN THE Bulk_Import_Service SHALL mencatat error untuk baris tersebut dan melanjutkan proses untuk baris lainnya
4. THE Bulk_Import_Service SHALL menyimpan kolom-kolom diluar field standar siswa sebagai data custom dalam field extraData
5. WHEN proses import selesai, THE Bulk_Import_Service SHALL mengembalikan laporan berisi jumlah data berhasil diimport, jumlah error, dan detail error per baris
6. THE Bulk_Import_Service SHALL mendukung format file CSV dan XLSX
7. THE Bulk_Import_Service SHALL menangani file berisi hingga 5000 baris data dalam waktu maksimal 60 detik

### Requirement 3: Mengelola Data Custom Siswa Melalui UI

**User Story:** Sebagai admin, saya ingin melihat, menambah, mengedit, dan menghapus data custom siswa melalui interface, sehingga saya dapat mengelola data dengan mudah.

#### Acceptance Criteria

1. WHEN admin mengakses halaman detail siswa, THE System SHALL menampilkan semua data custom yang tersimpan untuk siswa tersebut
2. THE System SHALL menyediakan form untuk menambahkan pasangan key-value baru ke data custom siswa
3. THE System SHALL menyediakan tombol edit untuk setiap pasangan key-value yang ada
4. WHEN admin mengedit data custom, THE Custom_Data_Manager SHALL memperbarui nilai tersebut di database
5. THE System SHALL menyediakan tombol hapus untuk setiap pasangan key-value
6. WHEN admin menghapus data custom, THE Custom_Data_Manager SHALL menghapus key tersebut dari field extraData
7. THE System SHALL menampilkan data custom dalam format yang mudah dibaca (table atau list)

### Requirement 4: Mapping Otomatis Variabel Custom dengan Data Siswa

**User Story:** Sebagai admin, saya ingin sistem secara otomatis mengisi variabel custom dalam template dengan data custom siswa, sehingga saya tidak perlu mengisi manual saat generate surat massal.

#### Acceptance Criteria

1. WHEN Letter_Generator memproses template untuk satu siswa, THE Variable_Mapper SHALL menggabungkan data standard siswa (nama, kelas, NISN) dengan data custom siswa dari field extraData
2. THE Variable_Mapper SHALL mencocokkan nama variabel dalam template (contoh: {{tempat_lahir}}) dengan key di data custom siswa
3. IF variabel dalam template tidak ditemukan di data siswa, THEN THE Variable_Mapper SHALL mengisi variabel tersebut dengan string kosong atau placeholder default
4. THE Variable_Mapper SHALL mendukung case-insensitive matching antara nama variabel dan key data custom
5. WHEN Letter_Generator memproses bulk generation untuk banyak siswa, THE Variable_Mapper SHALL melakukan mapping untuk setiap siswa secara independen
6. THE Variable_Mapper SHALL mempertahankan format data sesuai tipe aslinya saat mengisi variabel (date diformat sebagai tanggal, number tetap sebagai angka)

### Requirement 5: Validasi Data Custom Saat Import

**User Story:** Sebagai admin, saya ingin sistem memvalidasi data yang saya import, sehingga saya tahu jika ada data yang salah sebelum disimpan.

#### Acceptance Criteria

1. WHEN Bulk_Import_Service membaca file import, THE System SHALL memvalidasi bahwa file memiliki kolom NISN
2. IF file tidak memiliki kolom NISN, THEN THE System SHALL mengembalikan error dan menghentikan proses import
3. THE System SHALL memvalidasi bahwa setiap baris memiliki nilai NISN yang tidak kosong
4. THE System SHALL memvalidasi bahwa nama kolom tidak mengandung karakter spesial yang tidak diperbolehkan (hanya huruf, angka, underscore)
5. WHEN nama kolom mengandung spasi atau huruf kapital, THE System SHALL menormalisasi nama kolom menjadi lowercase dengan underscore
6. THE System SHALL memberikan peringatan jika ada kolom dengan nama yang sama setelah normalisasi

### Requirement 6: Export Template Data Custom Siswa

**User Story:** Sebagai admin, saya ingin mengekspor data custom siswa ke file CSV/Excel, sehingga saya dapat mengedit data secara offline dan mengimport ulang.

#### Acceptance Criteria

1. THE System SHALL menyediakan endpoint atau tombol untuk export data custom siswa
2. WHEN admin melakukan export, THE System SHALL menghasilkan file CSV atau Excel berisi kolom NISN, Nama, dan semua key dari data custom yang ada di sistem
3. THE System SHALL menggabungkan semua unique key dari seluruh siswa sebagai kolom dalam file export
4. IF siswa tidak memiliki nilai untuk key tertentu, THEN THE System SHALL mengisi cell tersebut dengan nilai kosong
5. THE System SHALL menyelesaikan export untuk hingga 5000 siswa dalam waktu maksimal 30 detik
6. WHEN export selesai, THE System SHALL mengembalikan file yang dapat didownload oleh admin

### Requirement 7: Menampilkan Preview Data Sebelum Generate Surat

**User Story:** Sebagai admin, saya ingin melihat preview bagaimana variabel akan diisi dengan data siswa sebelum generate surat, sehingga saya dapat memastikan data sudah benar.

#### Acceptance Criteria

1. THE System SHALL menyediakan fitur preview pada halaman generate surat
2. WHEN admin memilih template dan siswa, THE System SHALL menampilkan preview surat untuk salah satu siswa dengan data yang sudah terisi
3. THE System SHALL menandai variabel yang tidak memiliki data dengan highlight atau warna berbeda
4. THE System SHALL menampilkan daftar variabel yang dibutuhkan template dan status ketersediaan datanya untuk siswa yang dipilih
5. WHEN admin memilih siswa berbeda di preview, THE System SHALL memperbarui preview dengan data siswa yang baru dipilih

### Requirement 8: Logging dan Audit Trail Data Custom

**User Story:** Sebagai admin, saya ingin sistem mencatat perubahan pada data custom siswa, sehingga saya dapat melacak siapa yang mengubah data dan kapan.

#### Acceptance Criteria

1. WHEN Custom_Data_Manager memperbarui data custom siswa, THE System SHALL mencatat timestamp perubahan di field updatedAt siswa
2. THE System SHALL mencatat informasi user yang melakukan perubahan jika memungkinkan
3. WHEN Bulk_Import_Service melakukan import, THE System SHALL mencatat log berisi jumlah record yang diubah dan timestamp
4. THE System SHALL menyimpan log import dengan status (success, partial_success, failed) dan detail error jika ada

### Requirement 9: Mengelola Custom Variables di Settings Global

**User Story:** Sebagai admin, saya ingin mendefinisikan daftar variabel custom yang umum digunakan di sistem, sehingga saya dapat dengan mudah mengetahui variabel apa saja yang tersedia.

#### Acceptance Criteria

1. THE System SHALL menyediakan halaman settings untuk mengelola daftar custom variables global
2. WHEN admin menambahkan custom variable baru, THE System SHALL menyimpannya di tabel Setting dalam field customVariables
3. THE System SHALL menampilkan daftar custom variables yang sudah terdefinisi
4. THE System SHALL menyediakan fitur untuk menambah dan menghapus custom variable dari daftar
5. WHEN admin membuat atau mengedit template, THE System SHALL menampilkan daftar custom variables yang tersedia sebagai referensi
6. THE Custom_Data_Manager SHALL tetap menerima dan menyimpan data custom dengan key yang tidak ada di daftar global

### Requirement 10: Handling Data Custom Saat Generate Surat Massal

**User Story:** Sebagai admin, saya ingin sistem menangani kasus dimana tidak semua siswa memiliki data lengkap untuk variabel yang dibutuhkan, sehingga proses generate tetap berjalan lancar.

#### Acceptance Criteria

1. WHEN Letter_Generator memproses siswa yang tidak memiliki data untuk variabel tertentu, THE System SHALL mengisi variabel tersebut dengan string kosong atau nilai default yang dikonfigurasi
2. THE Letter_Generator SHALL tetap menghasilkan surat untuk siswa meskipun beberapa variabel tidak memiliki data
3. THE System SHALL mencatat di log generation daftar siswa dan variabel yang tidak memiliki data
4. WHEN semua siswa dalam batch tidak memiliki data untuk variabel critical tertentu, THE System SHALL memberikan warning kepada admin sebelum proses generate dimulai
5. THE System SHALL menyediakan opsi untuk admin mengatur nilai default per variabel custom di level template atau global settings
