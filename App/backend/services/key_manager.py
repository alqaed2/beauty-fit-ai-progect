import asyncio
import logging
from google.genai import errors
from services.key_manager import gemini_key_manager  # استيراد المدير الذي أنشأناه

logger = logging.getLogger(__name__)

async def generate_tutorial_image_with_retry(prompt: str, image_bytes: bytes):
    """
    دالة توليد الصور مع التدوير الذكي للمفاتيح في حال استنفاد الحصة (429)
    """
    total_keys = gemini_key_manager.get_total_keys_count()
    max_attempts = max(total_keys, 1)

    for attempt in range(max_attempts):
        current_api_key = gemini_key_manager.get_current_key()
        
        try:
            # --- هنا يتم استدعاء مكتبة Gemini بالمفتاح الحالي ---
            # مثال حسب المكتبة المستخدمة لديك (google-genai / google-generativeai):
            # client = genai.Client(api_key=current_api_key)
            # response = await client.models.generate_images(...)
            
            # نفترض نجاح الاستدعاء:
            response = await your_gemini_api_call(api_key=current_api_key, prompt=prompt, image=image_bytes)
            return response

        except errors.APIError as e:
            # الفحص الدقيق لخطأ استنفاد الحصص (429 / RESOURCE_EXHAUSTED)
            is_rate_limit = (
                getattr(e, 'code', None) == 429 
                or "429" in str(e) 
                or "RESOURCE_EXHAUSTED" in str(e)
            )

            if is_rate_limit and attempt < max_attempts - 1:
                logger.warning(
                    f"[ProTutorial] Key index {gemini_key_manager.current_index} exhausted. "
                    f"Retrying with next key... (Attempt {attempt + 1}/{max_attempts})"
                )
                # التبديل للمفتاح التالي فوراً
                gemini_key_manager.rotate_key()
                # انتظار 0.3 ثانية لتفادي الـ Burst Requests
                await asyncio.sleep(0.3)
            else:
                # إذا كان الخطأ ليس حصة، أو انتهت كل المفاتيح المتاحة
                logger.error(f"[ProTutorial] Critical error or all keys exhausted: {e}")
                raise e
