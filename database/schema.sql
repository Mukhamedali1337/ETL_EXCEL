IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[training_records]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[training_records] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [employee_id] NVARCHAR(50) NOT NULL,
        [full_name] NVARCHAR(255) NOT NULL,
        [email] NVARCHAR(255) NOT NULL,
        [course_code] NVARCHAR(100) NOT NULL,
        [course_name] NVARCHAR(255) NOT NULL,
        [completion_date] DATE NOT NULL,
        [score] INT NOT NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE UNIQUE INDEX UX_training_records_unique_import
        ON [dbo].[training_records] ([employee_id], [course_code], [completion_date]);
END;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[import_batches]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[import_batches] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [uploaded_by] NVARCHAR(100) NOT NULL,
        [uploaded_by_name] NVARCHAR(255) NOT NULL,
        [original_file_name] NVARCHAR(255) NOT NULL,
        [file_hash] NVARCHAR(64) NOT NULL,
        [total_rows] INT NOT NULL DEFAULT 0,
        [valid_rows] INT NOT NULL DEFAULT 0,
        [error_rows] INT NOT NULL DEFAULT 0,
        [inserted_rows] INT NOT NULL DEFAULT 0,
        [status] NVARCHAR(50) NOT NULL,
        [notes] NVARCHAR(MAX) NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [completed_at] DATETIME2 NULL
    );

    CREATE UNIQUE INDEX UX_import_batches_file_hash
        ON [dbo].[import_batches] ([file_hash]);
END;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[free_import_batches]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[free_import_batches] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [file_hash] NVARCHAR(64) NOT NULL,
        [file_name] NVARCHAR(260) NULL,
        [table_name] NVARCHAR(128) NULL,
        [row_count] INT NULL,
        [uploaded_by] NVARCHAR(100) NULL,
        [uploaded_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE UNIQUE INDEX UX_free_import_batches_hash
        ON [dbo].[free_import_batches] ([file_hash]);
END;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[portal_login_log]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[portal_login_log] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [username] NVARCHAR(100) NOT NULL,
        [display_name] NVARCHAR(255) NULL,
        [logged_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[portal_roles]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[portal_roles] (
        [username] NVARCHAR(100) NOT NULL PRIMARY KEY,
        [role] NVARCHAR(50) NOT NULL DEFAULT 'trainer',
        [granted_by] NVARCHAR(100) NULL,
        [granted_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[portal_template_labels]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[portal_template_labels] (
        [template_id] NVARCHAR(100) NOT NULL PRIMARY KEY,
        [display_name] NVARCHAR(255) NULL,
        [description] NVARCHAR(1000) NULL,
        [updated_by] NVARCHAR(100) NULL,
        [updated_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[import_errors]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[import_errors] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [batch_id] INT NOT NULL,
        [row_number] INT NULL,
        [field_name] NVARCHAR(100) NULL,
        [error_message] NVARCHAR(1000) NOT NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_import_errors_batch FOREIGN KEY ([batch_id]) REFERENCES [dbo].[import_batches]([id])
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[welcome_attendance]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[welcome_attendance] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [training_date] DATE NULL,
        [iin] NVARCHAR(20) NULL,
        [department] NVARCHAR(255) NULL,
        [employee_name] NVARCHAR(255) NULL,
        [position] NVARCHAR(255) NULL,
        [attended] NVARCHAR(20) NULL,
        [_imported_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [_imported_by] NVARCHAR(100) NULL
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[internal_trainer_sessions]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[internal_trainer_sessions] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [trainer_iin] NVARCHAR(20) NULL,
        [trainer_name] NVARCHAR(255) NULL,
        [employee_iin] NVARCHAR(20) NULL,
        [employee_name] NVARCHAR(255) NULL,
        [training_date] DATE NULL,
        [topic] NVARCHAR(255) NULL,
        [duration_min] INT NULL,
        [checklist_score] FLOAT NULL,
        [training_rate_pct] FLOAT NULL,
        [kpi_pct] FLOAT NULL,
        [kpi_growth_pct] FLOAT NULL,
        [payment_fixed] DECIMAL(10,2) NULL,
        [payment_bonus] DECIMAL(10,2) NULL,
        [_imported_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [_imported_by] NVARCHAR(100) NULL
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[attestation]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[attestation] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [exam_date] DATE NULL,
        [iin] NVARCHAR(20) NULL,
        [full_name] NVARCHAR(255) NULL,
        [bonus_score] FLOAT NULL,
        [confirmed] NVARCHAR(5) NULL,
        [_imported_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [_imported_by] NVARCHAR(100) NULL
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[school_sessions]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[school_sessions] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [school_type] NVARCHAR(50) NULL,
        [iin] NVARCHAR(20) NULL,
        [name] NVARCHAR(255) NULL,
        [group_number] INT NULL,
        [training_date] DATE NULL,
        [module_name] NVARCHAR(255) NULL,
        [topic] NVARCHAR(255) NULL,
        [attendance_score] FLOAT NULL,
        [homework_deadline_score] FLOAT NULL,
        [homework_quality_score] FLOAT NULL,
        [_imported_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [_imported_by] NVARCHAR(100) NULL
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[external_training]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[external_training] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [start_date] DATE NULL,
        [end_date] DATE NULL,
        [training_name] NVARCHAR(255) NULL,
        [employee_iin] NVARCHAR(20) NULL,
        [employee_name] NVARCHAR(255) NULL,
        [status] NVARCHAR(50) NULL,
        [employee_rating] FLOAT NULL,
        [manager_rating] FLOAT NULL,
        [hours] FLOAT NULL,
        [cost] DECIMAL(10,2) NULL,
        [commitment_months] INT NULL,
        [_imported_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [_imported_by] NVARCHAR(100) NULL
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[internal_training]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[internal_training] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [training_date] DATE NULL,
        [training_name] NVARCHAR(255) NULL,
        [city] NVARCHAR(100) NULL,
        [format] NVARCHAR(20) NULL,
        [trainer_iin] NVARCHAR(20) NULL,
        [trainer_name] NVARCHAR(255) NULL,
        [employee_iin] NVARCHAR(20) NULL,
        [employee_name] NVARCHAR(255) NULL,
        [attended] NVARCHAR(20) NULL,
        [employee_rating] FLOAT NULL,
        [manager_rating] FLOAT NULL,
        [hours] FLOAT NULL,
        [_imported_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [_imported_by] NVARCHAR(100) NULL
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[vendor_training]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[vendor_training] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [training_date] DATE NULL,
        [vendor] NVARCHAR(255) NULL,
        [topic] NVARCHAR(255) NULL,
        [location] NVARCHAR(255) NULL,
        [format] NVARCHAR(20) NULL,
        [iin] NVARCHAR(20) NULL,
        [employee_name] NVARCHAR(255) NULL,
        [attended] NVARCHAR(20) NULL,
        [score] FLOAT NULL,
        [hours] FLOAT NULL,
        [_imported_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [_imported_by] NVARCHAR(100) NULL
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[mentorship_program]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[mentorship_program] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [intern_iin] NVARCHAR(20) NULL,
        [intern_name] NVARCHAR(255) NULL,
        [mentor_iin] NVARCHAR(20) NULL,
        [mentor_name] NVARCHAR(255) NULL,
        [mentor_category] NVARCHAR(10) NULL,
        [internship_start_date] DATE NULL,
        [score_intro] INT NULL,
        [score_test] INT NULL,
        [score_monthly_training] INT NULL,
        [score_to] INT NULL,
        [score_accessories] INT NULL,
        [score_smarts] INT NULL,
        [score_services] INT NULL,
        [penalty_nps] INT NULL,
        [total_score] INT NULL,
        [score_value] DECIMAL(10,2) NULL,
        [total_amount] DECIMAL(10,2) NULL,
        [_imported_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [_imported_by] NVARCHAR(100) NULL
    );
END;
GO
