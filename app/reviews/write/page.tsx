"use client";

import React, { useState } from "react";
import { supabase } from "../../../lib/supabase";
import ReviewContentForm, {
  ReviewContentData,
} from "../components/ReviewContentForm";
import ReviewImageUpload, {
  ReviewImageUploadData,
} from "../components/ReviewImageUpload";
import { useImageUpload } from "../hooks/useImageUpload";
import { useReviewContent } from "../hooks/useReviewContent";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import ReviewModal from "../components/ReviewModal"; // 모달 import 추가

export default function WriteReviewPage() {
  // 후기 내용 상태 및 로직
  const {
    form: contentData,
    setForm: setContentData,
    handleChange: handleContentChange,
    reset: resetContent,
    validate: validateContent,
  } = useReviewContent();

  // 이미지 업로드 상태 및 로직
  const {
    files: imageFiles,
    previews: imagePreviews,
    coverImageIndex,
    addFiles: addImageFiles,
    removeFile: removeImageFile,
    setCoverImage,
    reset: resetImages,
    upload,
    loading: isUploading,
    error: uploadError,
  } = useImageUpload();

  // 스토리지에 업로드된 이미지의 공개 url (여기서는 업로드 완료 확인용으로 사용)
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

  const router = useRouter();

  // 모달 상태
  const [modal, setModal] = useState<{
    title: string;
    detail: string;
  } | null>(null);

  // ReviewImageUpload에 맞는 value 객체 생성
  const imageValue = {
    files: imageFiles,
    previews: imagePreviews,
    coverImageIndex,
  };

  // onChange 핸들러: ReviewImageUploadData 타입을 받아 훅의 상태로 반영
  const handleImageUploadChange = (data: ReviewImageUploadData) => {
    // 커버 이미지 선택 변경
    if (data.coverImageIndex !== coverImageIndex) {
      setCoverImage(data.coverImageIndex);
      return;
    }

    // 파일이 삭제된 경우
    if (data.files.length < imageFiles.length) {
      resetImages();
      if (data.files.length > 0) {
        addImageFiles(data.files);
      }
      return;
    }

    // 새 이미지 추가
    if (data.files.length > imageFiles.length) {
      const newFiles = data.files.slice(imageFiles.length);
      addImageFiles(newFiles);
    }
  };

  // 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 입력 유효성 검사
    const errorMsg = validateContent();
    if (errorMsg) {
      setModal(null);
      setModal({
        title: "다시 수정하세요",
        detail: errorMsg,
      }); //모달 교체 완료
      return;
    }
    try {
      // 사용자 정보 가져오기
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        //에러나거나, 사용자 정보가 없으면
        setModal({
          title: "사용자 정보 가져오기 실패",
          detail: userError?.message ?? "알 수 없는 오류가 발생했습니다.",
        }); // 모달 교체 완료료
        return;
      }
      const userId = user?.id;

      // 리뷰 내용을 reviews 테이블에 저장
      const { data: reviewData, error: reviewError } = await supabase
        .from("reviews")
        .insert({
          ...contentData,
          created_at: new Date(
            Date.now() - new Date().getTimezoneOffset() * 60000
          )
            .toISOString()
            .slice(0, -1),
          user_id: userId,
        })
        .select()
        .single();
      if (reviewError || !reviewData) {
        setModal({
          title: "후기 저장 실패",
          detail: reviewError?.message ?? "알 수 없는 오류가 발생했습니다.",
        }); // 모달 교체 완료
        return;
      }
      const reviewId = reviewData.id;

      // 이미지 업로드 및 images 테이블 저장
      const uploaded = await upload(reviewId);
      setUploadedUrls(uploaded || []);

      // 상태 초기화
      resetImages();
      resetContent();

      // 페이지 이동
      router.push(`/reviews/${reviewId}`);
    } catch (e: any) {
      setModal({
        title: "오류 발생",
        detail: e.message || "이미지 업로드 중 오류가 발생했습니다.",
      }); // 모달 교체 완료료
    }
  };

  return (
    <div>
      <Header />
      <div className="relative w-full max-w-6xl mx-auto bg-white text-[#413D3D] rounded-2xl shadow-lg px-4 py-8 sm:px-6 md:px-8 lg:px-12 xl:px-16">
        <button
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center text-2xl font-bold text-gray-400 hover:text-gray-600 bg-white/80 rounded-full shadow transition-all duration-200"
          style={{ lineHeight: 1 }}
          aria-label="닫기"
          onClick={() => router.push("/reviews")}
        >
          ×
        </button>
        <h1 className="text-2xl font-bold mb-6">후기 작성</h1>
        <form onSubmit={handleSubmit}>
          <ReviewContentForm
            value={contentData}
            onChange={setContentData}
            disabled={isUploading}
          />

          <ReviewImageUpload
            value={imageValue}
            onChange={handleImageUploadChange}
            onRemove={removeImageFile}
            disabled={isUploading}
          />

          <button
            type="submit"
            disabled={isUploading}
            className="w-full bg-[#F4CCC4] text-[#413D3D] py-2 rounded-xl hover:shadow-lg  items-center disabled:bg-gray-300"
          >
            {isUploading ? "등록 중..." : "후기 등록"}
          </button>
        </form>
      </div>

      {/* ✅ Footer를 하단에 고정 */}
      <footer className="bg-white/60 backdrop-blur-md py-9 text-sm text-gray-600 mt-auto relative px-6 flex items-center">
        <div
          className="absolute inset-y-0 left-16 w-40 bg-no-repeat bg-left bg-contain pointer-events-none"
          style={{ backgroundImage: "url('/images/h1trip-logo.png')" }}
        />
        <p className="relative z-10 pl-[10rem] text-left w-full">
          © 2025 h1 Trip. 모든 여행자들의 꿈을 응원합니다. 🌟
        </p>
      </footer>

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
