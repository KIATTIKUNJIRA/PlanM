import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// สร้าง Interface สำหรับข้อมูล Location (เหมือนหน้าแรก)
interface Location {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

const LocationDetailPage = () => {
  const router = useRouter();
  const { id } = router.query; // ดึง id ของสาขาจาก URL

  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ตรวจสอบให้แน่ใจว่าเราได้ id มาจาก URL แล้ว
    if (id) {
      const fetchLocationData = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('locations')
          .select('*')
          .eq('id', id) // ค้นหาเฉพาะ id ที่ตรงกัน
          .single(); // บอกให้รู้ว่าเราต้องการข้อมูลแค่แถวเดียว

        if (error) {
          console.error('Error fetching location details:', error);
        } else {
          setLocation(data);
        }
        setLoading(false);
      };

      fetchLocationData();
    }
  }, [id]); // ให้ useEffect ทำงานใหม่ทุกครั้งที่ id เปลี่ยนไป

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!location) {
    return <div className="flex justify-center items-center h-screen">Location not found.</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <button onClick={() => router.back()} className="mb-4 text-blue-500">
        &larr; Back to Map
      </button>
      <h1 className="text-4xl font-bold mb-2">{location.name}</h1>
      <p className="text-lg text-gray-600 mb-8">{location.address}</p>
      
      {/* ==================================================================
        พื้นที่ตรงนี้คือส่วนที่เราจะนำ "แปลน (Floor Plan)" ของสาขา
        มาแสดงในขั้นตอนถัดไปครับ
        ==================================================================
      */}
      <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Floor Plan Area</p>
      </div>
    </div>
  );
};

export default LocationDetailPage;