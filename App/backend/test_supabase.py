import os
from supabase import create_client, Client

url: str = os.environ.get("SUPABASE_URL", "https://fcvvadaakaycsopkixwn.supabase.co")
key: str = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjdnZhZGFha2F5Y3NvcGtpeHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4Njk2MTIsImV4cCI6MjEwMTQ0NTYxMn0.-sDlru0l17te7qXbLyiTJHvO41Us7RhgRgDlsxIsc8g")

supabase: Client = create_client(url, key)


def run_test():
    print("🔄 جاري الاتصال بقاعدة البيانات...")
    try:
        response = supabase.table("profiles").select("*").execute()
        print("\n✅ تم الاتصال بنجاح!")
        print(f"📊 عدد السجلات الحالية في الجدول: {len(response.data) if response.data else 0}")
        print("📝 البيانات المسترجعة:")
        print(response.data)
    except Exception as e:
        print("\n❌ حدث خطأ أثناء الاتصال:")
        print(e)


if __name__ == "__main__":
    run_test()
