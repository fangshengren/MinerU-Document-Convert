from pathlib import Path

import gradio as gr

from app import (
    BASE_DIR,
    FILE_DIR,
    RESULT_DIR,
    MINERU_TOKEN,
)

# ─── Custom CSS ──────────────────────────────────────────────────

CUSTOM_CSS = """
    .main-header {
        text-align: center;
        padding: 1.5rem 0 0.5rem;
    }
    .main-header h1 {
        font-size: 2rem;
        font-weight: 700;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
    .card-container {
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 1.25rem;
        background: #fafafa;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        height: 100%;
    }
    .card-title {
        font-size: 1.05rem;
        font-weight: 600;
        color: #374151;
        margin-bottom: 0.75rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #667eea40;
    }
    .status-success {
        color: #059669;
        font-weight: 500;
    }
    .status-error {
        color: #dc2626;
        font-weight: 500;
    }
    .status-info {
        color: #6366f1;
        font-weight: 500;
    }
    #process-btn, #search-btn {
        width: 100%;
        padding: 0.85rem 1.5rem !important;
        font-size: 1.05rem !important;
        font-weight: 600 !important;
        letter-spacing: 0.02em;
        border-radius: 10px !important;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        border: none !important;
        transition: transform 0.15s, box-shadow 0.15s;
    }
    #process-btn:hover, #search-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4) !important;
    }
    .query-status {
        min-height: unset !important;
        height: auto !important;
        flex: none !important;
    }
    .query-status > div {
        min-height: unset !important;
        height: auto !important;
        padding: 0.25rem 0;
    }
    #content-preview {
        padding: 1rem;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        background: #fefefe;
        min-height: 200px;
        max-height: 600px;
        overflow-y: auto;
    }
    #content-preview h1 { font-size: 1.5rem; font-weight: 700; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.4rem; margin-top: 1.2rem; }
    #content-preview h2 { font-size: 1.25rem; font-weight: 600; color: #374151; margin-top: 1rem; }
    #content-preview h3 { font-size: 1.1rem; font-weight: 600; color: #4b5563; margin-top: 0.8rem; }
    #content-preview p { line-height: 1.7; color: #374151; margin: 0.5rem 0; }
    #content-preview ul, #content-preview ol { padding-left: 1.5rem; margin: 0.5rem 0; }
    #content-preview li { line-height: 1.6; margin: 0.2rem 0; }
    #content-preview code {
        background: #f3f4f6;
        padding: 0.15rem 0.4rem;
        border-radius: 4px;
        font-size: 0.9em;
        color: #6366f1;
    }
    #content-preview pre {
        background: #1e293b;
        color: #e2e8f0;
        padding: 1rem;
        border-radius: 8px;
        overflow-x: auto;
        font-size: 0.88rem;
        line-height: 1.5;
    }
    #content-preview pre code {
        background: none;
        padding: 0;
        color: inherit;
        font-size: inherit;
    }
    #content-preview table {
        width: 100%;
        border-collapse: collapse;
        margin: 0.75rem 0;
        font-size: 0.92rem;
    }
    #content-preview th {
        background: #f3f4f6;
        font-weight: 600;
        padding: 0.5rem 0.75rem;
        border: 1px solid #d1d5db;
        text-align: left;
    }
    #content-preview td {
        padding: 0.4rem 0.75rem;
        border: 1px solid #e5e7eb;
    }
    #content-preview blockquote {
        border-left: 3px solid #667eea;
        padding: 0.4rem 0.8rem;
        margin: 0.5rem 0;
        color: #6b7280;
        background: #f9fafb;
        border-radius: 0 6px 6px 0;
    }
    #content-preview a {
        color: #6366f1;
        text-decoration: underline;
    }
    footer {visibility: hidden}
    .gradio-container {max-width: 1200px !important}
"""

SUPPORTED_FORMATS_TEXT = (
    "**Markdown(.md)** · "
    "**Txt(.txt)** · "
    "**PDF** · **Word** (.doc/.docx) · **PPT** (.ppt/.pptx) · "
    "**Excel** (.xls/.xlsx) · **Images** (.png/.jpg/.jpeg/.jp2/.webp/.gif/.bmp) · "
    "**HTML** (.html/.htm)"
)

# ─── Build UI ────────────────────────────────────────────────────

with gr.Blocks(title="Document Rule Manager") as demo:
    gr.HTML('<div class="main-header"><h1>Document Rule Manager</h1></div>')

    with gr.Tabs():
        # ═══ Tab 1: Rule Convert & Store ═══
        with gr.Tab("Rule Convert & Store", id="convert"):
            gr.Markdown(f"Supported formats: {SUPPORTED_FORMATS_TEXT}")

            with gr.Row(equal_height=True):
                with gr.Column(scale=2):
                    with gr.Group(elem_classes="card-container"):
                        gr.HTML('<div class="card-title">1. Upload & Configure</div>')
                        rule_files = gr.File(
                            label="Select rule files",
                            file_count="multiple",
                            file_types=[".pdf", ".doc", ".docx", ".ppt", ".pptx",
                                        ".xls", ".xlsx", ".png", ".jpg", ".jpeg",
                                        ".jp2", ".webp", ".gif", ".bmp", ".html", ".htm",
                                        ".txt", ".md"],
                        )
                        with gr.Row():
                            with gr.Column(scale=2):
                                rule_type_input = gr.Textbox(
                                    label="Rule Type",
                                    placeholder="e.g. 发票, 收据, 合同",
                                )
                            with gr.Column(scale=2):
                                company_name_input = gr.Textbox(
                                    label="Company Name",
                                    placeholder="e.g. 某某科技有限公司",
                                )
                        process_btn = gr.Button(
                            "Start Processing",
                            variant="primary",
                            size="lg",
                            elem_id="process-btn",
                        )

                with gr.Column(scale=3):
                    with gr.Group(elem_classes="card-container"):
                        gr.HTML('<div class="card-title">2. Results</div>')
                        rule_status = gr.Markdown("")
                        rule_result = gr.JSON(label="Processing Result")

            def handle_rule_process(files, rule_type, company_name):
                if not files:
                    return '<span class="status-error">Please select files to process.</span>', None
                if not rule_type or not rule_type.strip():
                    return '<span class="status-error">Please enter rule type.</span>', None
                if not company_name or not company_name.strip():
                    return '<span class="status-error">Please enter company name.</span>', None

                from mixOperation import convert_and_store

                file_paths = [f.name for f in files]
                results = convert_and_store(
                    file_paths=file_paths,
                    bill_type=rule_type.strip(),
                    company_name=company_name.strip(),
                )
                count = len(results)
                return (
                    f'<span class="status-success">Processed {count} file(s) successfully.</span>',
                    results,
                )

            process_btn.click(
                fn=handle_rule_process,
                inputs=[rule_files, rule_type_input, company_name_input],
                outputs=[rule_status, rule_result],
            )

        # ═══ Tab 2: Rule Query ═══
        with gr.Tab("Rule Query", id="query"):
            with gr.Row():
                with gr.Column(scale=2):
                    with gr.Group(elem_classes="card-container"):
                        gr.HTML('<div class="card-title">Search Filters</div>')
                        query_rule_type = gr.Textbox(
                            label="Rule Type",
                            placeholder="e.g. 发票",
                        )
                        query_company_name = gr.Textbox(
                            label="Company Name",
                            placeholder="e.g. 某某科技有限公司",
                        )
                        search_btn = gr.Button(
                            "Search",
                            variant="primary",
                            size="lg",
                            elem_id="search-btn",
                        )
                        query_status = gr.HTML(
                            "",
                            elem_classes="query-status",
                        )

                with gr.Column(scale=3):
                    with gr.Group(elem_classes="card-container"):
                        gr.HTML('<div class="card-title">Results</div>')
                        file_selector = gr.Dropdown(
                            label="Matching files — Select a file to preview its content",
                            choices=[],
                            interactive=True,
                            scale=1,
                        )
                        file_content_display = gr.Markdown(
                            "",
                            elem_id="content-preview",
                        )

            query_cache = gr.State([])

            def handle_rule_query(rule_type, company_name):
                if not rule_type or not rule_type.strip():
                    return (
                        '<span class="status-error">Please enter rule type.</span>',
                        gr.Dropdown(choices=[]),
                        [],
                        "",
                    )
                if not company_name or not company_name.strip():
                    return (
                        '<span class="status-error">Please enter company name.</span>',
                        gr.Dropdown(choices=[]),
                        [],
                        "",
                    )

                from databaseOperation import query_bill_data

                results = query_bill_data(
                    bill_type=rule_type.strip(),
                    company_name=company_name.strip(),
                )
                if not results:
                    return '<span class="status-error">No records found.</span>', gr.Dropdown(choices=[]), [], ""
                choices = [r["filename"] for r in results]
                return (
                    f'<span class="status-success">Found {len(results)} record(s).</span>',
                    gr.Dropdown(choices=choices, value=choices[0]),
                    results,
                    results[0]["content"] if results else "",
                )

            def on_file_select(filename, cached_results):
                if not filename or not cached_results:
                    return ""
                for r in cached_results:
                    if r["filename"] == filename:
                        return r["content"]
                return "Content not available"

            search_btn.click(
                fn=handle_rule_query,
                inputs=[query_rule_type, query_company_name],
                outputs=[query_status, file_selector, query_cache, file_content_display],
            )
            file_selector.change(
                fn=on_file_select,
                inputs=[file_selector, query_cache],
                outputs=[file_content_display],
            )

        # ═══ Tab 3: API Info ═══
        with gr.Tab("API Info", id="api"):
            with gr.Group(elem_classes="card-container"):
                gr.Markdown(f"""
                ### Configuration
                | Item | Value |
                |------|-------|
                | MinerU Token | {'Configured' if MINERU_TOKEN else 'Not configured'} |
                | Source Dir | `{FILE_DIR}` |
                | Result Dir | `{RESULT_DIR}` |
                """)

            with gr.Group(elem_classes="card-container"):
                gr.Markdown(f"""
                ### Supported Formats
                {SUPPORTED_FORMATS_TEXT}
                """)

            with gr.Group(elem_classes="card-container"):
                gr.Markdown("""
                ### API Endpoints

                | Method | Path | Description |
                |--------|------|-------------|
                | GET | `/api/files` | List source files |
                | GET | `/api/results` | List converted markdown files |
                | POST | `/api/upload` | Upload files (multipart) |
                | GET | `/api/download/<filename>` | Download markdown file |
                | POST | `/api/convert` | Async conversion |
                | POST | `/api/convert-upload` | Upload + convert synchronously |
                | GET | `/api/status/<task_id>` | Check task status |
                | GET | `/api/tasks` | List all tasks |
                | POST | `/api/convert-and-store` | Convert & store to Appwrite |
                | GET | `/api/query-rules` | Query rules by type & company |
                """)


if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860, share=False)
