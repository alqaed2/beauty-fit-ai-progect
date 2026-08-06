import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function TestSupabase() {
  const [profiles, setProfiles] = useState<Array<Record<string, unknown>>>([]);
  const [status, setStatus] = useState('جاري الاتصال بقاعدة البيانات...');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfiles() {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) {
        setStatus('❌ فشل الاتصال بقاعدة البيانات');
        setErrorDetails(error.message);
      } else {
        setStatus('✅ تم الاتصال بنجاح بقاعدة البيانات!');
        setProfiles(data ?? []);
      }
    }

    fetchProfiles();
  }, []);

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif', direction: 'rtl' }}>
      <h2>اختبار الاتصال بـ Supabase (Next.js)</h2>
      <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{status}</p>

      {errorDetails && (
        <p style={{ color: 'red', background: '#fee', padding: '10px', borderRadius: '5px' }}>
          <strong>تفاصيل الخطأ:</strong> {errorDetails}
        </p>
      )}

      <h3>البيانات المسترجعة من جدول profiles ({profiles.length}):</h3>
      <pre style={{ background: '#1e1e1e', color: '#00ff00', padding: '15px', borderRadius: '8px' }}>
        {JSON.stringify(profiles, null, 2)}
      </pre>
    </div>
  );
}
