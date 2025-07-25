/**
 * 이미지 업로드 폼
 * - 이미지 선택, 삭제 
 * - 커버 이미지 선택
 */

import React, { useRef, useState } from "react";
import ReviewModal from "./ReviewModal";

export interface ReviewImageUploadData {
  files: File[];
  previews: string[];
  coverImageIndex: number | null; // 커버 이미지 인덱스
}

interface ReviewImageUploadProps {
  value: ReviewImageUploadData;
  onChange: (data: ReviewImageUploadData) => void;
  onRemove?: (index: number) => void;
  disabled?: boolean;
}

export default function ReviewImageUpload({
  value,
  onChange,
  onRemove,
  disabled,
}: ReviewImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  //모달 상태 
  const [modal, setModal] = useState<{
    title: string;
    detail: string;
  } | null>(null);

  // 이미지 선택
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + value.files.length > 5) {
      setModal(null),
      
      setModal({
        title: "이미지는 최대 5장까지 업로드 가능합니다.",
        detail: `현재 ${files.length + value.files.length}장`,
      }); // 모달 교체 
      return;
    }

    // 파일만 전달하고 미리보기는 훅에서 처리
    onChange({
      files: [...value.files, ...files],
      previews: [], // 미리보기는 훅에서 자동 생성되므로 빈 배열 전달
      coverImageIndex: value.coverImageIndex // 기존 대표 이미지 설정 유지
    });
  };

  // 이미지 제거
  const handleRemove = (index: number) => {
    if (onRemove) {
      onRemove(index);
    } else {
      const newFiles = [...value.files];
      const newPreviews = [...value.previews];
      newFiles.splice(index, 1);
      newPreviews.splice(index, 1);
      
      // 커버 이미지가 삭제되는 경우 처리
      let newCoverIndex = value.coverImageIndex;
      if (index === value.coverImageIndex) {
        newCoverIndex = null;
      } else if (value.coverImageIndex !== null && index < value.coverImageIndex) {
        newCoverIndex = value.coverImageIndex - 1;
      }
      
      onChange({ 
        files: newFiles, 
        previews: newPreviews,
        coverImageIndex: newCoverIndex
      });
    }
  };

  // 커버 이미지 선택
  const handleCoverSelect = (index: number) => {
    onChange({
      ...value,
      coverImageIndex: index
    });
  };

  return (
    <div className="mb-8">
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        사진 업로드 (최대 5장)
      </label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
        {value.previews.map((image, index) => (
          <div key={index} className="relative group">
            <img
              src={image}
              alt={`미리보기 ${index + 1}`}
              className={`w-full h-24 object-cover rounded-lg ${
                value.coverImageIndex === index ? 'ring-2 ring-pink-500' : ''
              }`}
            />
            <div className="absolute -top-2 -right-2 flex gap-1">
              {/* 커버 이미지 선택 버튼 */}
              <button
                type="button"
                onClick={() => handleCoverSelect(index)}
                className={`w-6 h-6 ${
                  value.coverImageIndex === index 
                    ? 'bg-pink-500' 
                    : 'bg-gray-500 hover:bg-pink-400'
                } text-white rounded-full text-xs transition-colors cursor-pointer flex items-center justify-center`}
                disabled={disabled}
                title={value.coverImageIndex === index ? '커버 이미지' : '커버 이미지로 설정'}
              >
                ★
              </button>
              {/* 삭제 버튼 */}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors cursor-pointer flex items-center justify-center"
                disabled={disabled}
              >
                ×
              </button>
            </div>
          </div>
        ))}
        {value.files.length < 5 && (
          <label className="border-2 border-dashed border-gray-300 rounded-lg h-24 flex flex-col items-center justify-center cursor-pointer hover:border-pink-300 transition-colors">
            <i className="ri-camera-line text-xl text-gray-400 mb-1"></i>
            <span className="text-xs text-gray-500">사진 추가</span>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              ref={inputRef}
              disabled={disabled}
            />
          </label>
        )}
      </div>
      <p className="text-xs text-gray-500">
        JPG, PNG 파일만 업로드 가능합니다. (각 파일 최대 5MB)
      </p>
      <p className="text-xs text-gray-500 mt-1">
        ★ 버튼을 클릭하여 커버 이미지를 선택해주세요.
      </p>

      {modal && (
        <ReviewModal
          title={modal.title}
          detail={modal.detail}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
