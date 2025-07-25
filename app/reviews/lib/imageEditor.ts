/**
 * Supabase 이미지 수정
 */
import { supabase } from "../../../lib/supabase";
import { generateImageFileName, uploadImageToStorage } from "./imageUtils";

// 기존 이미지 -> 순서 정렬을 위해서 url 뿐만 아니라 order, is_cover 도 필요
interface ExistingImage {
  url: string;
  order: number;
  is_cover?: boolean;
}

interface ImageWithNewFlag extends ExistingImage {
  isNew: boolean;
}

// 이미지 삭제 (스토리지 + DB)
export async function deleteImage(reviewId: number, image: ExistingImage) {
  // 스토리지 삭제
  const fileName = image.url.split("/").pop();
  if (fileName) {
    const { error: storageErr } = await supabase.storage
      .from("images")
      .remove([fileName]);
    if (storageErr) console.error("스토리지 삭제 실패:", storageErr.message);
  }

  // DB 삭제
  const { error: dbDeleteErr } = await supabase
    .from("images")
    .delete()
    .eq("review_id", reviewId)
    .filter('"order"', "eq", image.order);
  if (dbDeleteErr) throw new Error(dbDeleteErr.message);
}

// 이미지 교체 (기존 삭제 + 새 이미지 업로드)
export async function replaceImage(
  reviewId: number,
  oldImage: ExistingImage,
  newFile: File
) {
  // 기존 파일 삭제(스토리지)
  const oldFileName = oldImage.url.split("/").pop();
  if (oldFileName) {
    const { error: storageRemoveError } = await supabase.storage
      .from("images")
      .remove([oldFileName]);
    if (storageRemoveError)
      console.error("스토리지 삭제 실패:", storageRemoveError.message);
  }

  // 새 파일 업로드
  const fileName = generateImageFileName(newFile, `${reviewId}-replace-${oldImage.order}-`);
  const newUrl = await uploadImageToStorage(newFile, fileName);

  // DB img_url 업데이트 (is_cover 상태 유지)
  const { error: updateError } = await supabase
    .from("images")
    .update({ img_url: newUrl })
    .eq("review_id", reviewId)
    .filter('"order"', "eq", oldImage.order);
  if (updateError) throw new Error(updateError.message);

  return newUrl;
}

// 이미지 커버 상태 업데이트
export async function updateImageCover(reviewId: number, order: number | null) {
  // 1) 기존 커버 이미지가 있다면 is_cover를 false로 설정
  const { error: resetError } = await supabase
    .from("images")
    .update({ is_cover: false })
    .eq("review_id", reviewId)
    .eq("is_cover", true);
  
  if (resetError) throw new Error(resetError.message);

  // 2) 새로운 커버 이미지 설정 (order가 null이면 커버 이미지 해제만 수행)
  if (order !== null) {
    const { error: updateError } = await supabase
      .from("images")
      .update({ is_cover: true })
      .eq("review_id", reviewId)
      .filter('"order"', "eq", order);
    
    if (updateError) throw new Error(updateError.message);
  }
}

// 새 이미지 업로드 및 순서 재할당
export async function updateImagesOrder(
  reviewId: number,
  remainingExistingImages: ExistingImage[],
  newFiles: File[],
  newCoverImageIndex: number | null,
  existingCoverOrder: number | null // 변경: 기존 인덱스 대신 기존 커버 이미지 order 값
) {
  // 1) 새 이미지 업로드
  const uploadedUrls: string[] = [];
  for (let i = 0; i < newFiles.length; i++) {
    const file = newFiles[i];
    const fileName = generateImageFileName(file, `${reviewId}-new-${i}-`);
    const imageUrl = await uploadImageToStorage(file, fileName);
    uploadedUrls.push(imageUrl);
  }

  // 2) 기존 이미지 + 새 이미지 합침 (순서 유지)
  const allImages: ImageWithNewFlag[] = [
    ...remainingExistingImages.map((img) => ({ ...img, isNew: false })),
    ...uploadedUrls.map((url, idx) => ({
      url,
      order: remainingExistingImages.length + idx,
      isNew: true,
    })),
  ];

  // 3) 대표이미지 결정
  const existingCoverIndexInRemaining = existingCoverOrder !== null
    ? remainingExistingImages.findIndex(img => img.order === existingCoverOrder)
    : -1;

  let coverIndex = -1;

  if (newCoverImageIndex !== null) {
    // 새 이미지 중 커버 지정된 경우
    coverIndex = remainingExistingImages.length + newCoverImageIndex;
  } else if (existingCoverIndexInRemaining !== -1) {
    // 기존 대표 이미지가 삭제되지 않고 존재하면 유지
    coverIndex = existingCoverIndexInRemaining;
  } else {
    // 대표 이미지 삭제되었거나 없으면 대표 이미지 없음 (coverIndex = -1)
    coverIndex = -1;
  }


  // 4) 기존 커버 이미지 초기화
  await supabase
    .from("images")
    .update({ is_cover: false })
    .eq("review_id", reviewId);

  // 5) allImages 순회하며 DB 업데이트 또는 insert
  for (let i = 0; i < allImages.length; i++) {
    const img = allImages[i];
    const isCover = i === coverIndex;

    if (img.isNew) {
      // 새 이미지 insert
      const { error: insertError } = await supabase.from("images").insert({
        review_id: reviewId,
        img_url: img.url,
        order: i,
        is_cover: isCover,
      });
      if (insertError) throw new Error(insertError.message);
    } else {
      // 기존 이미지 update
      const oldOrder = img.order;
      const { error: updateError } = await supabase
        .from("images")
        .update({
          order: i,
          is_cover: isCover,
        })
        .eq("review_id", reviewId)
        .filter('"order"', "eq", oldOrder);
      if (updateError) throw new Error(updateError.message);
    }
  }

  return uploadedUrls;
}

