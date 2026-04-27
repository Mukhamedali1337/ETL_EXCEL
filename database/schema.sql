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
