"""
Project Backup Utility for Plum Cave

https://github.com/Northstrix/plum-cave

MIT License

Copyright (c) 2025 Maxim Bortnikov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
Credit:
https://replit.com/~
https://www.perplexity.ai/
https://chat.mistral.ai/chat
"""
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import os
import sys
import zipfile
import datetime
import base64
import sqlite3
import random
import string

class Database:
    """Database class for managing SQLite operations"""
    def __init__(self, db_file="backup_projects.db"):
        """Initialize database connection and create tables if they don't exist"""
        self.db_file = db_file
        self.conn = sqlite3.connect(self.db_file)
        self.cursor = self.conn.cursor()
        self._create_tables()

    def _create_tables(self):
        """Create database tables if they don't exist"""
        # Create projects table
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                folder_path TEXT NOT NULL,
                description TEXT,
                file_exclusions TEXT,
                folder_exclusions TEXT
            )
        ''')
        self.conn.commit()

    def _encode_text(self, text):
        """Encode text to base64 to handle non-Latin characters"""
        if text is None:
            return None
        return base64.b64encode(text.encode('utf-8')).decode('utf-8')

    def _decode_text(self, encoded_text):
        """Decode base64 text back to original form"""
        if not encoded_text:
            # Handle empty strings
            return ""
        return base64.b64decode(encoded_text.encode('utf-8')).decode('utf-8')

    def get_project(self, project_id):
        """Retrieve a specific project by its ID"""
        self.cursor.execute(
            "SELECT id, name, folder_path, description, file_exclusions, folder_exclusions FROM projects WHERE id = ?", (project_id,)
        )
        row = self.cursor.fetchone()
        if row:
            return {
                'id': row[0],
                'name': self._decode_text(row[1]),
                'folder_path': self._decode_text(row[2]),
                'description': self._decode_text(row[3]) if row[3] else "",
                'file_exclusions': [self._decode_text(excl) for excl in row[4].rstrip(',').split(',')] if row[4] else [],
                'folder_exclusions': [self._decode_text(excl) for excl in row[5].rstrip(',').split(',')] if row[5] else []
            }
        return None

    def update_project(self, project_id, name, folder_path, description="", file_exclusions=None, folder_exclusions=None):
        """Update project details"""
        encoded_name = self._encode_text(name)
        encoded_path = self._encode_text(folder_path)
        encoded_desc = self._encode_text(description)
        # Handle empty lists and None values
        file_exclusions = file_exclusions or []
        folder_exclusions = folder_exclusions or []
        encoded_file_exclusions = ','.join([self._encode_text(excl) for excl in file_exclusions]) + ','
        encoded_folder_exclusions = ','.join([self._encode_text(excl) for excl in folder_exclusions]) + ','
        self.cursor.execute(
            "UPDATE projects SET name = ?, folder_path = ?, description = ?, file_exclusions = ?, folder_exclusions = ? WHERE id = ?",
            (encoded_name, encoded_path, encoded_desc, encoded_file_exclusions, encoded_folder_exclusions, project_id)
        )
        self.conn.commit()

    def generate_random_id(self):
        """Generate a random ID of length 8 consisting of numbers, lowercase, and uppercase letters"""
        characters = string.ascii_letters + string.digits
        return ''.join(random.choice(characters) for _ in range(8))

    def check_id_existence(self, project_id):
        """Check if the generated ID already exists in the database"""
        self.cursor.execute("SELECT 1 FROM projects WHERE id = ?", (project_id,))
        return self.cursor.fetchone() is not None

    def add_project(self, name, folder_path, description=""):
        """Add a new project to the database"""
        project_id = self.generate_random_id()
        while self.check_id_existence(project_id):
            project_id = self.generate_random_id()
        encoded_name = self._encode_text(name)
        encoded_path = self._encode_text(folder_path)
        encoded_desc = self._encode_text(description)
        encoded_file_exclusions = ""
        encoded_folder_exclusions = self._encode_text("node_modules") + ","
        self.cursor.execute(
            "INSERT INTO projects (id, name, folder_path, description, file_exclusions, folder_exclusions) VALUES (?, ?, ?, ?, ?, ?)",
            (project_id, encoded_name, encoded_path, encoded_desc, encoded_file_exclusions, encoded_folder_exclusions)
        )
        self.conn.commit()
        return project_id

    def get_all_projects(self):
        """Retrieve all projects from the database"""
        self.cursor.execute("SELECT id, name, folder_path, description, file_exclusions, folder_exclusions FROM projects")
        projects = []
        for row in self.cursor.fetchall():
            projects.append({
                'id': row[0],
                'name': self._decode_text(row[1]),
                'folder_path': self._decode_text(row[2]),
                'description': self._decode_text(row[3]) if row[3] else "",
                'file_exclusions': [self._decode_text(excl) for excl in row[4].rstrip(',').split(',')] if row[4] else [],
                'folder_exclusions': [self._decode_text(excl) for excl in row[5].rstrip(',').split(',')] if row[5] else []
            })
        return projects

    def delete_project(self, project_id):
        """Delete a project"""
        self.cursor.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        self.conn.commit()

    def close(self):
        """Close the database connection"""
        if self.conn:
            self.conn.close()

class BackupManager:
    """Manages the backup creation process"""
    def __init__(self, database):
        """Initialize the backup manager with database access"""
        self.db = database

    def create_backup(self, project_id):
        """Create a backup for the specified project, with verbose debug output."""
        import datetime
        import os

        # Get project details
        project = self.db.get_project(project_id)
        if not project:
            print("DEBUG: Project not found for id:", project_id)
            return False, "Project not found"
        
        # Get exclusions directly from the project dictionary
        file_exclusions = set(project['file_exclusions'] or [])
        folder_exclusions = set(project['folder_exclusions'] or [])

        print("\n========== DEBUG: RAW EXCLUSIONS ==========")
        print("File exclusions (raw):", file_exclusions)
        print("Folder exclusions (raw):", folder_exclusions)

        # Normalize exclusions: all paths relative to project root, forward slashes, no leading/trailing slashes
        excluded_files = set(os.path.normpath(f).replace("\\", "/").strip("/") for f in file_exclusions)
        excluded_folders = set(os.path.normpath(f).replace("\\", "/").strip("/") for f in folder_exclusions)

        print("\n========== DEBUG: NORMALIZED EXCLUSIONS ==========")
        print("Excluded files (normalized):", excluded_files)
        for f in excluded_files:
            print("  Excluded file:", f)
        print("Excluded folders (normalized):", excluded_folders)
        for f in excluded_folders:
            print("  Excluded folder:", f)

        # Create timestamp for filename
        timestamp = datetime.datetime.now().strftime("%b-%d-%Y-%I-%M-%S-%p").upper()
        safe_name = "".join(c if c.isalnum() or c in (' ', '-', '_') else '_' for c in project['name'])
        default_filename = f"{safe_name}-{timestamp}.zip"

        # Ask user where to save the backup
        from tkinter import filedialog
        save_path = filedialog.asksaveasfilename(
            defaultextension=".zip",
            filetypes=[("ZIP files", "*.zip")],
            initialfile=default_filename
        )
        print("DEBUG: User chose save path:", save_path)

        if not save_path:
            print("DEBUG: Backup cancelled by user.")
            return False, "Backup cancelled by user"

        # Print source and destination info
        print("DEBUG: Source folder:", project['folder_path'])
        print("DEBUG: Destination archive:", save_path)

        # Make sure the archive doesn't end up inside itself
        archive_rel = os.path.relpath(save_path, project['folder_path']).replace("\\", "/").strip("/")

        try:
            # Create the backup
            return self._create_zip_backup(
                project['folder_path'], 
                save_path, 
                excluded_files, 
                excluded_folders,
                archive_rel
            )
        except Exception as e:
            import traceback
            print("DEBUG: Exception during backup!\n", traceback.format_exc())
            return False, f"Backup failed: {str(e)}"

    def _show_progress_popup(self, root, initial_text=""):
        popup = tk.Toplevel(root)
        popup.title("Backup Progress")
        popup.geometry("500x100")
        popup.configure(bg=ModernUITheme.BG_COLOR)
        popup.transient(root)
        popup.grab_set()
        popup.focus_set()
        # Center the popup
        popup.update_idletasks()
        x = root.winfo_rootx() + (root.winfo_width() // 2) - 250
        y = root.winfo_rooty() + (root.winfo_height() // 2) - 50
        popup.geometry(f"+{x}+{y}")
        # Label for folder path
        label = tk.Label(
            popup, 
            text=initial_text, 
            font=("Helvetica", 12, "bold"),
            bg=ModernUITheme.BG_COLOR, 
            fg=ModernUITheme.THEME_COLOR1,
            wraplength=480,
            anchor="w",
            justify="left"
        )
        label.pack(fill=tk.BOTH, expand=True, padx=20, pady=30)
        popup.update()
        return popup, label
    
    def _create_zip_backup(self, source_dir, dest_file, excluded_files, excluded_folders, archive_rel):
        import os
        import zipfile
        import tkinter as tk

        # Get the root window (assuming you pass it or have a reference)
        root = None
        if hasattr(self, 'root'):
            root = self.root
        elif hasattr(self, 'app') and hasattr(self.app, 'root'):
            root = self.app.root
        else:
            # fallback: try to get root from any widget
            try:
                root = tk._default_root
            except Exception:
                pass

        # Show progress popup
        popup, label = self._show_progress_popup(root, "Starting backup...")

        if not os.path.exists(source_dir):
            popup.destroy()
            print("DEBUG: Source directory not found:", source_dir)
            return False, f"Source directory not found: {source_dir}"

        files_added = 0
        files_skipped = 0
        folders_skipped = 0

        def get_folder_size(path):
            total = 0
            for dirpath, dirnames, filenames in os.walk(path):
                for f in filenames:
                    fp = os.path.join(dirpath, f)
                    if os.path.isfile(fp):
                        total += os.path.getsize(fp)
            return total

        print("\n========== DEBUG: STARTING BACKUP ==========")
        print("DEBUG: Walking source folder:", source_dir)
        print("DEBUG: Archive REL path:", archive_rel)

        with zipfile.ZipFile(dest_file, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zipf:
            for rootdir, dirs, files in os.walk(source_dir):
                rel_root = os.path.relpath(rootdir, source_dir).replace("\\", "/").strip(".")
                rel_root = "" if rel_root == "." else rel_root

                # Update the progress label for the current folder
                folder_display = os.path.relpath(rootdir, source_dir)
                label.config(text=f"Backing up: {folder_display}")
                popup.update_idletasks()
                popup.update()

                # ... (rest of your code for exclusions and adding files)
                # Filter out excluded directories
                original_dirs = list(dirs)
                keep_dirs = []
                for d in dirs:
                    folder_rel = os.path.join(rel_root, d).replace("\\", "/").strip("/")
                    excluded = False
                    for excl in excluded_folders:
                        if folder_rel == excl or folder_rel.startswith(excl + "/"):
                            print(f"DEBUG: Skipping excluded folder: {folder_rel}")
                            folders_skipped += 1
                            excluded = True
                            break
                    if not excluded:
                        keep_dirs.append(d)
                dirs[:] = keep_dirs

                # Process files in current directory
                for file in files:
                    file_path = os.path.join(rootdir, file)
                    rel_path = os.path.relpath(file_path, source_dir).replace("\\", "/").strip("/")
                    if rel_path == archive_rel:
                        print(f"DEBUG: Skipping output archive itself: {rel_path}")
                        files_skipped += 1
                        continue
                    if rel_path in excluded_files:
                        print(f"DEBUG: Skipping excluded file: {rel_path}")
                        files_skipped += 1
                        continue
                    in_excluded_folder = False
                    for excl in excluded_folders:
                        if rel_path.startswith(excl + "/"):
                            print(f"DEBUG: Skipping file in excluded folder: {rel_path} (excluded folder: {excl})")
                            files_skipped += 1
                            in_excluded_folder = True
                            break
                    if in_excluded_folder:
                        continue
                    print(f"DEBUG: Adding file: {rel_path}")
                    zipf.write(file_path, rel_path)
                    files_added += 1

        popup.destroy()  # Close the progress window

        print("\n========== DEBUG: BACKUP SUMMARY ==========")
        print(f"DEBUG: Files added: {files_added}")
        print(f"DEBUG: Files skipped: {files_skipped}")
        print(f"DEBUG: Folders skipped: {folders_skipped}")
        archive_size = os.path.getsize(dest_file)
        source_size = get_folder_size(source_dir)
        print(f"DEBUG: Archive size: {archive_size/1024:.2f} KB")
        print(f"DEBUG: Source folder size: {source_size/1024:.2f} KB")
        return True, f"Backup completed successfully. {files_added} files added to {dest_file}\n\nSee console for debug info."
        
class ModernUITheme:
    """Defines colors and styles for the modern UI theme"""
    # Color scheme
    BG_COLOR = "#151419"
    FG_COLOR = "#ffffff"
    THEME_COLOR1 = "#A123F4"
    THEME_COLOR2 = "#603DEC"
    THEME_RED = "#F0033A"
    THEME_COLOR1_LIGHT = "#A62EF5"
    THEME_COLOR2_LIGHT = "#6847ED"
    THEME_RED_LIGHT = "#FC034E"
    CARD_BG = "#24222b"
    BORDER_COLOR = "#363340"
    SEPARATOR_COLOR = "#363640"
    # Universal padding constants
    PAD_X = 0
    PAD_Y = 8
    INNER_PAD_X = 8
    INNER_PAD_Y = 6
    # Button styles
    FIRST_BUTTON_STYLE = {
        "background": THEME_COLOR1,
        "foreground": FG_COLOR,
        "activebackground": THEME_COLOR1_LIGHT,
        "activeforeground": FG_COLOR,
        "font": ("Helvetica", 11, "bold"),
        "cursor": "hand2",
        "borderwidth": 0,
        "highlightthickness": 0,
        "padx": INNER_PAD_X,
        "pady": INNER_PAD_Y
    }
    SECONDARY_BUTTON_STYLE = {
        "background": THEME_COLOR2,
        "foreground": FG_COLOR,
        "activebackground": THEME_COLOR2_LIGHT,
        "activeforeground": FG_COLOR,
        "font": ("Helvetica", 11, "bold"),
        "cursor": "hand2",
        "borderwidth": 0,
        "highlightthickness": 0,
        "padx": INNER_PAD_X,
        "pady": INNER_PAD_Y
    }
    DELETE_BUTTON_STYLE = {
        "background": THEME_RED,
        "foreground": FG_COLOR,
        "activebackground": THEME_RED_LIGHT,
        "activeforeground": FG_COLOR,
        "font": ("Helvetica", 11, "bold"),
        "cursor": "hand2",
        "borderwidth": 0,
        "highlightthickness": 0,
        "padx": INNER_PAD_X,
        "pady": INNER_PAD_Y
    }
    # Entry styles
    ENTRY_STYLE = {
        "background": "#2d2b36",
        "foreground": FG_COLOR,
        "insertbackground": FG_COLOR,
        "font": ("Helvetica", 14),
        "relief": "flat",
        "borderwidth": 1,
        "highlightthickness": 0,
        "padding": (INNER_PAD_X, INNER_PAD_Y)
    }
    # Label styles
    LABEL_STYLE = {
        "background": BG_COLOR,
        "foreground": FG_COLOR,
        "font": ("Helvetica", 11),
        "padx": PAD_X,
        "pady": PAD_Y
    }
    TITLE_STYLE = {
        "background": BG_COLOR,
        "foreground": FG_COLOR,
        "font": ("Helvetica", 16, "bold"),
        "padx": PAD_X,
        "pady": PAD_Y
    }
    # Frame styles
    FRAME_STYLE = {
        "background": BG_COLOR,
        "bd": 0,
        "padx": PAD_X,
        "pady": PAD_Y
    }
    CARD_FRAME_STYLE = {
        "background": CARD_BG,
        "bd": 0,
        "padx": PAD_X,
        "pady": PAD_Y
    }
    # Listbox styles
    LISTBOX_STYLE = {
        "background": CARD_BG,
        "foreground": FG_COLOR,
        "selectbackground": THEME_COLOR1,
        "selectforeground": FG_COLOR,
        "font": ("Helvetica", 11),
        "borderwidth": 0,
        "highlightthickness": 0,
        "padding": (INNER_PAD_X, INNER_PAD_Y)
    }
    # Scrollbar style (recommended addition)
    SCROLLBAR_STYLE = {
        "activebackground": "#4a4757",
        "background": "#363340",
        "troughcolor": BG_COLOR,
        "borderwidth": 0,
        "highlightthickness": 0,
        "width": 12
    }

    @classmethod
    def apply_theme(cls, root):
        """Apply the theme to the root window and configure ttk styles"""
        root.configure(bg=cls.BG_COLOR)
        # Configure ttk styles
        style = ttk.Style()
        style.theme_use('clam')
        # Configure TButton style
        style.configure(
            'TButton',
            background=cls.THEME_COLOR1,
            foreground=cls.FG_COLOR,
            font=("Helvetica", 11),
            relief="flat"
        )
        style.map(
            'TButton',
            background=[('active', cls.THEME_COLOR2)],
            foreground=[('active', cls.FG_COLOR)]
        )
        # Configure TFrame style
        style.configure(
            'TFrame',
            background=cls.BG_COLOR,
            borderwidth=0
        )
        # Configure Card.TFrame style
        style.configure(
            'Card.TFrame',
            background=cls.CARD_BG,
            borderwidth=0
        )
        # Configure TLabel style
        style.configure(
            'TLabel',
            background=cls.BG_COLOR,
            foreground=cls.FG_COLOR,
            font=("Helvetica", 11)
        )
        # Configure Title.TLabel style
        style.configure(
            'Title.TLabel',
            background=cls.BG_COLOR,
            foreground=cls.FG_COLOR,
            font=("Helvetica", 16, "bold")
        )
        # Configure TEntry style
        style.configure(
            'TEntry',
            fieldbackground=cls.CARD_BG,
            foreground=cls.FG_COLOR,
            font=("Helvetica", 12)
        )

class ScrollableFrame(tk.Frame):
    """A scrollable frame widget"""
    def __init__(self, container, *args, **kwargs):
        super().__init__(container, *args, **kwargs)
        canvas = tk.Canvas(self, bg=ModernUITheme.BG_COLOR, highlightthickness=0)
        scrollbar = ttk.Scrollbar(self, orient="vertical", command=canvas.yview)
        self.scrollable_frame = ttk.Frame(canvas, style='TFrame')
        self.scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        canvas.create_window((0, 0), window=self.scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

class ProjectCard(tk.Frame):
    """A card widget for displaying project information"""
    def __init__(self, parent, project, on_delete, on_backup, database, **kwargs):
        super().__init__(parent, **ModernUITheme.CARD_FRAME_STYLE, **kwargs)
        self.project = project
        self.on_delete = on_delete
        self.on_backup = on_backup
        self.database = database
        self.master = parent.master
        # Card padding
        self.padx = 15
        self.pady = 10
        # Project name
        self.name_label = tk.Label(
            self,
            text=project['name'],
            font=("Helvetica", 14, "bold"),
            background=ModernUITheme.CARD_BG,
            foreground=ModernUITheme.FG_COLOR
        )
        self.name_label.grid(row=0, column=0, sticky="w", padx=self.padx, pady=(self.pady, 2))
        # Project path
        self.path_label = tk.Label(
            self,
            text=project['folder_path'],
            background=ModernUITheme.CARD_BG,
            foreground="#cccccc",
            font=("Helvetica", 11)
        )
        self.path_label.grid(row=1, column=0, sticky="w", padx=self.padx, pady=(0, 2))
        # Project description
        if project['description']:
            self.desc_label = tk.Label(
                self,
                text=project['description'],
                wraplength=350,
                justify=tk.LEFT,
                background=ModernUITheme.CARD_BG,
                foreground=ModernUITheme.FG_COLOR,
                font=("Helvetica", 11)
            )
            self.desc_label.grid(row=2, column=0, sticky="w", padx=self.padx, pady=(0, self.pady))
        # Separator
        separator = tk.Frame(self, height=1, background=ModernUITheme.SEPARATOR_COLOR)
        separator.grid(row=3, column=0, sticky="ew", pady=(self.pady, 0))
        # Buttons frame
        self.btn_frame = tk.Frame(self, **ModernUITheme.CARD_FRAME_STYLE)
        self.btn_frame.grid(row=4, column=0, sticky="w", padx=self.padx, pady=(5, self.pady))
        # New Backup button
        self.backup_btn = tk.Button(
            self.btn_frame,
            text="New Backup",
            command=lambda: self.on_backup(project['id']),
            **ModernUITheme.FIRST_BUTTON_STYLE
        )
        self.backup_btn.pack(side=tk.LEFT, padx=(0, 10))
        # Configure Exclusions button
        self.exclusions_btn = tk.Button(
            self.btn_frame,
            text="Configure Exclusions",
            command=lambda: self._show_exclusions_dialog(project['id']),
            **ModernUITheme.SECONDARY_BUTTON_STYLE
        )
        self.exclusions_btn.pack(side=tk.LEFT, padx=(0, 10))
        # Delete button
        self.delete_btn = tk.Button(
            self.btn_frame,
            text="Delete Project",
            command=lambda: self.on_delete(project['id']),
            **ModernUITheme.DELETE_BUTTON_STYLE
        )
        self.delete_btn.pack(side=tk.LEFT, padx=(0, 10))
        # Hover effects
        self.bind("<Enter>", self._on_enter)
        self.bind("<Leave>", self._on_leave)

    def _on_enter(self, event):
        """Handle mouse enter event"""
        self.configure(background="#2e2c37")
        self.name_label.configure(background="#2e2c37")
        self.path_label.configure(background="#2e2c37")
        self.btn_frame.configure(background="#2e2c37")
        if hasattr(self, 'desc_label'):
            self.desc_label.configure(background="#2e2c37")

    def _on_leave(self, event):
        """Handle mouse leave event"""
        self.configure(background=ModernUITheme.CARD_BG)
        self.name_label.configure(background=ModernUITheme.CARD_BG)
        self.path_label.configure(background=ModernUITheme.CARD_BG)
        self.btn_frame.configure(background=ModernUITheme.CARD_BG)
        if hasattr(self, 'desc_label'):
            self.desc_label.configure(background=ModernUITheme.CARD_BG)

    def _show_exclusions_dialog(self, project_id):
        """Show exclusions management dialog with scrollable content"""
        project = self.database.get_project(project_id)
        if not project:
            messagebox.showerror("Error", "Project not found")
            return

        # Create dialog
        dialog = tk.Toplevel(self.master)
        dialog.title(f"Manage Exclusions - {project['name']}")
        dialog.geometry("700x600")
        dialog.configure(bg=ModernUITheme.BG_COLOR)
        dialog.transient(self.master)
        dialog.grab_set()
        dialog.focus_set()

        # Center the dialog
        dialog.geometry("+%d+%d" % (
            self.master.winfo_rootx() + (self.master.winfo_width() // 2) - 350,
            self.master.winfo_rooty() + (self.master.winfo_height() // 2) - 300
        ))

        # Track changes
        file_exclusions = project['file_exclusions'].copy()
        folder_exclusions = project['folder_exclusions'].copy()
        project_path = project['folder_path']

        def relative_path(full_path):
            """Convert absolute path to project-relative path"""
            try:
                return os.path.relpath(full_path, project_path).replace("\\", "/")
            except ValueError:
                return full_path  # Fallback if paths are on different drives

        def is_within_project(path):
            """Check if the path is within the project directory"""
            return os.path.commonpath([os.path.abspath(path), os.path.abspath(project_path)]) == os.path.abspath(project_path)

        # Main container with scrollbar
        main_frame = ttk.Frame(dialog, style='TFrame')
        main_frame.pack(fill=tk.BOTH, expand=True)
        canvas = tk.Canvas(main_frame, bg=ModernUITheme.BG_COLOR, highlightthickness=0)
        scrollbar = ttk.Scrollbar(main_frame, orient="vertical", command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas, style='TFrame')
        scrollable_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        # ===================== File Exclusions Section =====================
        file_frame = ttk.Frame(scrollable_frame, style='Card.TFrame')
        file_frame.pack(fill=tk.X, padx=20, pady=(20, 10), ipady=10)
        ttk.Label(file_frame, text="File Exclusions", background=ModernUITheme.CARD_BG, font=("Helvetica", 14, "bold")).pack(anchor=tk.W, pady=8, padx=8)

        # File List Container
        file_list_container = ttk.Frame(file_frame, style='Card.TFrame')
        file_list_container.pack(fill=tk.X, pady=(0, 10))

        def refresh_file_list():
            """Refresh file exclusion list display"""
            for widget in file_list_container.winfo_children():
                widget.destroy()
            if not file_exclusions:
                empty_label = ttk.Label(file_list_container, text="No file exclusions configured", style='TLabel', background=ModernUITheme.CARD_BG)
                empty_label.pack(fill=tk.X, pady=5)
                return
            for excl in file_exclusions:
                item_frame = ttk.Frame(file_list_container, style='Card.TFrame')
                item_frame.pack(fill=tk.X, pady=2)
                ttk.Label(item_frame, text=excl, style='TLabel', background=ModernUITheme.BG_COLOR, width=50, anchor=tk.W).pack(side=tk.LEFT, fill=tk.X, expand=True, padx=ModernUITheme.INNER_PAD_X, pady=ModernUITheme.INNER_PAD_Y)
                del_btn = tk.Button(item_frame, text="×", font=("Helvetica", 12, "bold"), fg=ModernUITheme.THEME_RED, bg=ModernUITheme.CARD_BG, activeforeground=ModernUITheme.THEME_RED_LIGHT, activebackground=ModernUITheme.CARD_BG, relief="flat", cursor="hand2", command=lambda e=excl: delete_file(e))
                del_btn.pack(side=tk.RIGHT, padx=5)
                del_btn.bind("<Enter>", lambda e: del_btn.config(fg=ModernUITheme.THEME_RED_LIGHT))
                del_btn.bind("<Leave>", lambda e: del_btn.config(fg=ModernUITheme.THEME_RED))

        # File Controls
        file_control_frame = ttk.Frame(file_frame, style='TFrame')
        file_control_frame.pack(fill=tk.X)
        file_entry = tk.Entry(file_control_frame, bg=ModernUITheme.CARD_BG, fg=ModernUITheme.FG_COLOR, insertbackground=ModernUITheme.FG_COLOR, font=("Helvetica", 12), relief="flat", highlightbackground=ModernUITheme.BORDER_COLOR, highlightthickness=1)
        file_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 10), ipady=4)

        def add_file():
            """Add file exclusion"""
            path = file_entry.get().strip()
            if not path:
                selected = filedialog.askopenfilename(initialdir=project_path)
                if selected:
                    if is_within_project(selected):
                        path = relative_path(selected)
                        file_entry.delete(0, tk.END)
                        file_entry.insert(0, path)
                    else:
                        messagebox.showerror("Error", "The selected file is outside the project folder.")
                        return
                else:
                    return
            if path not in file_exclusions:
                file_exclusions.append(path)
                refresh_file_list()
                file_entry.delete(0, tk.END)

        def delete_file(excl):
            """Remove file exclusion with confirmation"""
            confirm = messagebox.askyesno("Confirm Delete", f"Remove file exclusion?\n\n{excl}", parent=dialog)
            if confirm:
                file_exclusions.remove(excl)
                refresh_file_list()

        tk.Button(file_control_frame, text="Add File", command=add_file, **ModernUITheme.SECONDARY_BUTTON_STYLE).pack(side=tk.LEFT, padx=(0, 5))
        tk.Button(file_control_frame, text="Browse...", command=lambda: file_entry.insert(0, filedialog.askopenfilename(initialdir=project_path)), **ModernUITheme.SECONDARY_BUTTON_STYLE).pack(side=tk.LEFT, padx=(0, 5))

        # ===================== Folder Exclusions Section =====================
        folder_frame = ttk.Frame(scrollable_frame, style='Card.TFrame')
        folder_frame.pack(fill=tk.X, padx=20, pady=10, ipady=10)
        ttk.Label(folder_frame, text="Folder Exclusions", background=ModernUITheme.CARD_BG, font=("Helvetica", 14, "bold")).pack(anchor=tk.W, pady=8, padx=8)

        # Folder List Container
        folder_list_container = ttk.Frame(folder_frame, style='Card.TFrame')
        folder_list_container.pack(fill=tk.X, pady=(0, 10))

        def refresh_folder_list():
            """Refresh folder exclusion list display"""
            for widget in folder_list_container.winfo_children():
                widget.destroy()
            if not folder_exclusions:
                empty_label = ttk.Label(folder_list_container, text="No folder exclusions configured", style='TLabel', background=ModernUITheme.CARD_BG)
                empty_label.pack(fill=tk.X, pady=5)
                return
            for excl in folder_exclusions:
                item_frame = ttk.Frame(folder_list_container, style='Card.TFrame')
                item_frame.pack(fill=tk.X, pady=2)
                ttk.Label(item_frame, text=excl, style='TLabel', background=ModernUITheme.BG_COLOR, width=50, anchor=tk.W).pack(side=tk.LEFT, fill=tk.X, expand=True, padx=ModernUITheme.INNER_PAD_X, pady=ModernUITheme.INNER_PAD_Y)
                del_btn = tk.Button(item_frame, text="×", font=("Helvetica", 12, "bold"), fg=ModernUITheme.THEME_RED, bg=ModernUITheme.CARD_BG, activeforeground=ModernUITheme.THEME_RED_LIGHT, activebackground=ModernUITheme.CARD_BG, relief="flat", cursor="hand2", command=lambda e=excl: delete_folder(e))
                del_btn.pack(side=tk.RIGHT, padx=5)
                del_btn.bind("<Enter>", lambda e: del_btn.config(fg=ModernUITheme.THEME_RED_LIGHT))
                del_btn.bind("<Leave>", lambda e: del_btn.config(fg=ModernUITheme.THEME_RED))

        # Folder Controls
        folder_control_frame = ttk.Frame(folder_frame, style='TFrame')
        folder_control_frame.pack(fill=tk.X)
        folder_entry = tk.Entry(folder_control_frame, bg=ModernUITheme.CARD_BG, fg=ModernUITheme.FG_COLOR, insertbackground=ModernUITheme.FG_COLOR, font=("Helvetica", 12), relief="flat", highlightbackground=ModernUITheme.BORDER_COLOR, highlightthickness=1)
        folder_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 10), ipady=4)

        def add_folder():
            """Add folder exclusion"""
            path = folder_entry.get().strip()
            if not path:
                selected = filedialog.askdirectory(initialdir=project_path)
                if selected:
                    if is_within_project(selected):
                        path = relative_path(selected)
                        folder_entry.delete(0, tk.END)
                        folder_entry.insert(0, path)
                    else:
                        messagebox.showerror("Error", "The selected folder is outside the project folder.")
                        return
                else:
                    return
            if path not in folder_exclusions:
                folder_exclusions.append(path)
                refresh_folder_list()
                folder_entry.delete(0, tk.END)

        def delete_folder(excl):
            """Remove folder exclusion with confirmation"""
            confirm = messagebox.askyesno("Confirm Delete", f"Remove folder exclusion?\n\n{excl}", parent=dialog)
            if confirm:
                folder_exclusions.remove(excl)
                refresh_folder_list()

        tk.Button(folder_control_frame, text="Add Folder", command=add_folder, **ModernUITheme.SECONDARY_BUTTON_STYLE).pack(side=tk.LEFT, padx=(0, 5))
        tk.Button(folder_control_frame, text="Browse...", command=lambda: folder_entry.insert(0, filedialog.askdirectory(initialdir=project_path)), **ModernUITheme.SECONDARY_BUTTON_STYLE).pack(side=tk.LEFT, padx=(0, 5))

        # Initial population
        refresh_file_list()
        refresh_folder_list()

        # Save and Cancel buttons
        def save_changes():
            """Save changes to the database"""
            try:
                self.database.update_project(project_id, project['name'], project['folder_path'], project['description'], file_exclusions, folder_exclusions)
                messagebox.showinfo("Success", "Exclusions updated successfully")
            except Exception as e:
                messagebox.showerror("Error", f"Failed to update exclusions: {str(e)}")
            dialog.destroy()
            self._load_projects()

        btn_frame = tk.Frame(dialog, **ModernUITheme.FRAME_STYLE)
        btn_frame.pack(fill=tk.X, pady=(10, 20), padx=20)
        tk.Button(btn_frame, text="Save Changes", command=save_changes, **ModernUITheme.FIRST_BUTTON_STYLE).pack(side=tk.RIGHT, padx=(10, 0))
        tk.Button(btn_frame, text="Cancel", command=dialog.destroy, **ModernUITheme.SECONDARY_BUTTON_STYLE).pack(side=tk.RIGHT, padx=(10, 0))

class BackupUtilityApp:
    """Main application class for the Backup Utility"""
    def __init__(self, root):
        """Initialize the application with the root window"""
        self.root = root
        self.root.title("Project Backup Utility")
        self.root.geometry("900x650")
        self.root.minsize(800, 600)
        # Initialize database
        self.db = Database()
        # Initialize backup manager
        self.backup_manager = BackupManager(self.db)
        # Apply theme
        ModernUITheme.apply_theme(self.root)
        # Setup UI
        self._setup_ui()
        # Load projects
        self._load_projects()

    def _setup_ui(self):
        """Setup the user interface"""
        # Main frame
        self.main_frame = ttk.Frame(self.root, style='TFrame')
        self.main_frame.pack(fill=tk.BOTH, expand=True)
        # Setup left panel for projects list
        self._setup_projects_panel()

    def _setup_projects_panel(self):
        """Setup the projects panel (left side)"""
        # Projects panel frame
        self.projects_panel = ttk.Frame(self.main_frame, style='TFrame')
        self.projects_panel.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        # Header frame
        self.header_frame = ttk.Frame(self.projects_panel, style='TFrame')
        self.header_frame.pack(fill=tk.X, pady=(0, 10))
        # Title
        self.title_label = ttk.Label(
            self.header_frame,
            text="Projects",
            style='Title.TLabel'
        )
        self.title_label.pack(fill=tk.BOTH, anchor=tk.W)
        # Add project button
        self.add_project_btn = tk.Button(
            self.header_frame,
            text="+ New Project",
            command=self._show_new_project_dialog,
            **ModernUITheme.FIRST_BUTTON_STYLE
        )
        self.add_project_btn.pack(side=tk.RIGHT, anchor=tk.E)
        # Projects list
        self.projects_frame = ScrollableFrame(self.projects_panel)
        self.projects_frame.pack(fill=tk.BOTH, expand=True)

    def _load_projects(self):
        """Load and display all projects"""
        # Clear existing projects
        for widget in self.projects_frame.scrollable_frame.winfo_children():
            widget.destroy()
        # Get projects from database
        projects = self.db.get_all_projects()
        if not projects:
            # Show empty state
            empty_label = ttk.Label(
                self.projects_frame.scrollable_frame,
                text="No projects found. Create a new project to get started.",
                style='TLabel'
            )
            empty_label.pack(pady=20)
            return
        # Add project cards
        for idx, project in enumerate(projects):
            card = ProjectCard(
                self.projects_frame.scrollable_frame,
                project,
                self._delete_project,
                self._create_backup,
                self.db  # Add database reference here
            )
            card.pack(fill=tk.X, pady=(0 if idx == 0 else 10, 0))
            # Add separator between cards
            if idx < len(projects) - 1:
                separator = tk.Frame(self.projects_frame.scrollable_frame, height=1, background=ModernUITheme.SEPARATOR_COLOR)
                separator.pack(fill=tk.X, pady=(10, 0))

    def _show_new_project_dialog(self):
        """Show dialog for creating a new project"""
        dialog = tk.Toplevel(self.root)
        dialog.title("Create New Project")
        dialog.geometry("500x500")
        dialog.configure(bg=ModernUITheme.BG_COLOR)
        dialog.transient(self.root)
        dialog.grab_set()
        # Center the dialog on the parent window
        dialog.geometry("+%d+%d" % (
            self.root.winfo_rootx() + (self.root.winfo_width() / 2) - 250,
            self.root.winfo_rooty() + (self.root.winfo_height() / 2) - 150
        ))
        # Title
        title_label = tk.Label(
            dialog,
            text="Create New Project",
            **ModernUITheme.TITLE_STYLE
        )
        title_label.pack(pady=(20, 15), padx=20, anchor=tk.W)
        # Form frame with consistent internal padding
        form_frame = tk.Frame(dialog, **ModernUITheme.FRAME_STYLE)
        form_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=0)
        # Project name
        name_label = tk.Label(
            form_frame,
            text="Project Name:",
            **ModernUITheme.LABEL_STYLE
        )
        name_label.pack(anchor=tk.W, pady=(0, 5))
        entry_style = {k: v for k, v in ModernUITheme.ENTRY_STYLE.items() if k not in ["highlightthickness", "padding"]}
        name_entry = tk.Entry(
            form_frame,
            **entry_style,
            highlightbackground=ModernUITheme.BORDER_COLOR,
            highlightthickness=1
        )
        name_entry.pack(fill=tk.X, pady=(0, 15), ipady=4)
        # Project directory
        dir_label = tk.Label(
            form_frame,
            text="Project Directory:",
            **ModernUITheme.LABEL_STYLE
        )
        dir_label.pack(anchor=tk.W, pady=(0, 5))
        dir_frame = tk.Frame(form_frame, **ModernUITheme.FRAME_STYLE)
        dir_frame.pack(fill=tk.X, pady=(0, 15))
        dir_entry = tk.Entry(
            dir_frame,
            **entry_style,
            highlightbackground=ModernUITheme.BORDER_COLOR,
            highlightthickness=1
        )
        dir_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, ipady=4)
        browse_btn = tk.Button(
            dir_frame,
            text="Browse...",
            command=lambda: self._browse_directory(dir_entry),
            **ModernUITheme.SECONDARY_BUTTON_STYLE
        )
        browse_btn.pack(side=tk.RIGHT, padx=(10, 0))
        # Project description
        desc_label = tk.Label(
            form_frame,
            text="Description (optional):",
            **ModernUITheme.LABEL_STYLE
        )
        desc_label.pack(anchor=tk.W, pady=(0, 5))
        desc_entry = tk.Text(
            form_frame,
            height=3,
            bg="#2d2b36",
            fg=ModernUITheme.FG_COLOR,
            insertbackground=ModernUITheme.FG_COLOR,
            font=("Helvetica", 12),
            relief="flat",
            borderwidth=0,
            highlightthickness=1,
            highlightbackground=ModernUITheme.BORDER_COLOR
        )
        desc_entry.pack(fill=tk.X, pady=(0, 15))
        # Buttons frame
        btn_frame = tk.Frame(dialog, **ModernUITheme.FRAME_STYLE)
        btn_frame.pack(fill=tk.X, pady=(0, 20), padx=20)
        cancel_btn = tk.Button(
            btn_frame,
            text="Cancel",
            command=dialog.destroy,
            **ModernUITheme.SECONDARY_BUTTON_STYLE
        )
        cancel_btn.pack(side=tk.RIGHT, padx=(10, 0))
        save_btn = tk.Button(
            btn_frame,
            text="Create Project",
            command=lambda: self._create_project(name_entry.get(), dir_entry.get(), desc_entry.get("1.0", tk.END).strip(), dialog),
            **ModernUITheme.FIRST_BUTTON_STYLE
        )
        save_btn.pack(side=tk.RIGHT)

    def _browse_directory(self, entry_widget):
        """Open dialog to browse for a directory"""
        directory = filedialog.askdirectory()
        if directory:
            entry_widget.delete(0, tk.END)
            entry_widget.insert(0, directory)

    def _create_project(self, name, folder_path, description, dialog):
        """Create a new project"""
        # Validate inputs
        if not name or not folder_path:
            messagebox.showerror("Error", "Project name and folder path are required")
            return
        # Validate folder path
        if not os.path.isdir(folder_path):
            messagebox.showerror("Error", "Invalid folder path")
            return
        try:
            # Add project to database
            self.db.add_project(name, folder_path, description)
            # Close dialog
            dialog.destroy()
            # Refresh projects list
            self._load_projects()
            messagebox.showinfo("Success", f"Project '{name}' created successfully")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to create project: {str(e)}")

    def _delete_project(self, project_id):
        """Delete a project"""
        project = self.db.get_project(project_id)
        # Confirm deletion
        confirm = messagebox.askyesno(
            "Confirm Delete",
            f"Are you sure you want to delete the project '{project['name']}'?\n\nThis action cannot be undone."
        )
        if confirm:
            # Delete from database
            self.db.delete_project(project_id)
            # Refresh projects list
            self._load_projects()

    def _create_backup(self, project_id):
        """Create a backup for the specified project"""
        # Change cursor to indicate processing
        self.root.config(cursor="wait")
        self.root.update()
        # Create backup
        success, message = self.backup_manager.create_backup(project_id)
        # Restore cursor
        self.root.config(cursor="")
        # Show result
        if success:
            messagebox.showinfo("Backup Complete", message)
        else:
            messagebox.showerror("Backup Failed", message)

    def on_closing(self):
        """Handle application closing"""
        self.db.close()
        self.root.destroy()

if __name__ == "__main__":
    # Create root window
    root = tk.Tk()
    # Create application
    app = BackupUtilityApp(root)
    # Set closing handler
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    # Start main loop
    root.mainloop()
