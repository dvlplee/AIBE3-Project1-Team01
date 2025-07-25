'use client';

import { format, eachDayOfInterval } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { ChevronUp, ChevronDown } from 'lucide-react';

type DailyPlans = {
  [date: string]: { place: string; detail: string }[];
};

type Props = {
  range: DateRange | undefined;
  dailyPlans: DailyPlans;
  setDailyPlans: React.Dispatch<React.SetStateAction<DailyPlans>>;
};

export default function DayInputs({ range, dailyPlans, setDailyPlans }: Props) {
  
  const selectedDates =
    range?.from && range?.to
      ? eachDayOfInterval({ start: range.from, end: range.to })
      : [];

  const handleInputChange = ( //장소/설명 입력 필드 변경 시 호출
    date: string,
    index: number,
    field: 'place' | 'detail',
    value: string
  ) => {
    setDailyPlans((prev) => {
      const current = prev[date] || []; 
      const updated = [...current];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, [date]: updated };
    });
  };

  const handleAddEntry = (date: string) => { //항목 추가 버튼 클릭 시 호출
    setDailyPlans((prev) => {
      const current = prev[date] || [];
      return {
        ...prev,
        [date]: [...current, { place: '', detail: '' }],
      };
    });
  };

  const handleDeleteItem = (date: string, index: number) => {
    const updated = { ...dailyPlans };

    if (!updated[date]) return;
    updated[date] = updated[date].filter((_, i) => i !== index);
    setDailyPlans(updated);
  };

  const moveEntry = (date: string, index: number, direction: 'up' | 'down') => {
    setDailyPlans((prev) => {
      const current = [...(prev[date] || [])];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      
      if (targetIndex < 0 || targetIndex >= current.length) return prev;
  
      // 스왑
      [current[index], current[targetIndex]] = [current[targetIndex], current[index]];
  
      return { ...prev, [date]: current };
    });
  };

  return (
    <div className="bg-white/80 backdrop-blur-md border rounded-2xl shadow-lg p-6 w-full max-h-[80vh] overflow-y-auto">
      <h2 className="text-xl font-bold mb-4 text-black">일정 입력</h2>
      {selectedDates.length === 0 ? (
        <p className="text-[#413D3D]">날짜를 선택하면 일정 입력란이 표시됩니다.</p>
      ) : (
        selectedDates.map((date) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const entries = dailyPlans[dateStr] || [];

          // 순서 바꾸기 함수
          const moveEntry = (date: string, idx: number, direction: 'up' | 'down') => {
            const arr = [...(dailyPlans[date] || [])];
            if (direction === 'up' && idx > 0) {
              [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
            } else if (direction === 'down' && idx < arr.length - 1) {
              [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
            }
            setDailyPlans({ ...dailyPlans, [date]: arr });
          };

          return (
            <div key={dateStr} className="mb-10 border-b border-[#F4CCC4] pb-6">
              <h3 className="font-semibold mb-3 text-lg text-[#413D3D]">{dateStr}</h3>

              <div className="flex flex-col gap-4">
                {entries.map((entry, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        className="w-[80%] border border-[#FBDED6] p-2 rounded bg-white text-[#413D3D] placeholder:text-gray-400"
                        value={entry.place}
                        onChange={(e) => handleInputChange(dateStr, idx, 'place', e.target.value)}
                        placeholder="여행지 이름"
                      />
                      
                      {/* 순서 바꾸기 버튼 */}
                      <button
                        onClick={() => moveEntry(dateStr, idx, 'up')}
                        className="w-8 h-8 rounded-full bg-transparent hover:bg-[#FBDED6] text-[#413D3D] flex items-center justify-center transition-colors"
                        title="위로"
                      >
                        <ChevronUp className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => moveEntry(dateStr, idx, 'down')}
                        className="w-8 h-8 rounded-full bg-transparent hover:bg-[#FBDED6] text-[#413D3D] flex items-center justify-center transition-colors"
                        title="아래로"
                      >
                        <ChevronDown className="w-5 h-5" />
                      </button>

                      {/* 삭제 버튼 */}
                      <button
                        onClick={() => handleDeleteItem(dateStr, idx)}
                        className="w-10 h-10 bg-[#C9E6E5] text-[#413D3D] rounded-full flex items-center justify-center shadow"
                      >
                        ✕
                      </button>
                    </div>
                    <textarea
                      placeholder="상세 설명"
                      value={entry.detail}
                      onChange={(e) =>
                        handleInputChange(dateStr, idx, 'detail', e.target.value)
                      }
                      className="w-full p-2 rounded border border-[#FBDED6] bg-white text-[#413D3D] placeholder:text-gray-400"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleAddEntry(dateStr)}
                className="mt-4 px-3 py-1 bg-[#C9E6E5] text-black text-sm rounded-xl shadow"
              >
                + 항목 추가
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}