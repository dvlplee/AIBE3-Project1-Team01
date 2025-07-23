// app/recommendation/components/useTourApiList.js
import { useState, useEffect } from "react";
import { AREA_COORDS } from "../constants/travelData";

export default function useTourApiList({
  areaCode,
  contentTypeId,
  cat1,
  cat2,
  cat3,
  keyword,
  pageNo,
  numOfRows,
  mode = "list", // "list" or "detail"
  contentid, // 상세 조회용
}) {
  const [places, setPlaces] = useState([]);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const apiKey = process.env.NEXT_PUBLIC_TOUR_API_KEY;
        const encodedKey = encodeURIComponent(apiKey);
        let url, data;
        if (mode === "detail" && contentid) {
          url = `https://apis.data.go.kr/B551011/KorService2/detailCommon2?serviceKey=${encodedKey}&MobileOS=ETC&MobileApp=AppTest&_type=json&contentId=${contentid}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error("상세 정보 호출 실패");
          data = await res.json();
          const item = data.response?.body?.items?.item;
          setDetail(Array.isArray(item) ? item[0] : item || null);
        } else {
          if (keyword && keyword.trim()) {
            url = `https://apis.data.go.kr/B551011/KorService2/searchKeyword2?serviceKey=${encodedKey}&MobileOS=ETC&MobileApp=AppTest&keyword=${encodeURIComponent(
              keyword
            )}&numOfRows=${numOfRows}&pageNo=${pageNo}&_type=json`;
            if (areaCode !== "") url += `&areaCode=${areaCode}`;
            if (contentTypeId !== "") url += `&contentTypeId=${contentTypeId}`;
            if (cat1 !== "") url += `&cat1=${cat1}`;
            if (cat2 !== "") url += `&cat2=${cat2}`;
            if (cat3 !== "") url += `&cat3=${cat3}`;
          } else {
            const coords = AREA_COORDS[areaCode] || AREA_COORDS[1];
            const { mapX, mapY } = coords;
            url = `https://apis.data.go.kr/B551011/KorService2/locationBasedList2?serviceKey=${encodedKey}&numOfRows=${numOfRows}&pageNo=${pageNo}&MobileOS=ETC&MobileApp=AppTest&_type=json&mapX=${mapX}&mapY=${mapY}&radius=20000`;
            if (areaCode !== "") url += `&areaCode=${areaCode}`;
            if (contentTypeId !== "") url += `&contentTypeId=${contentTypeId}`;
            if (cat1 !== "") url += `&cat1=${cat1}`;
            if (cat2 !== "") url += `&cat2=${cat2}`;
            if (cat3 !== "") url += `&cat3=${cat3}`;
          }
          const res = await fetch(url);
          data = await res.json();
          const items = Array.isArray(data.response?.body?.items?.item)
            ? data.response.body.items.item
            : data.response.body.items?.item
            ? [data.response.body.items.item]
            : [];
          setPlaces(items);
          setTotalCount(Number(data.response?.body?.totalCount) || 0);
        }
      } catch (e) {
        setError("데이터를 불러오지 못했습니다.");
        setPlaces([]);
        setDetail(null);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [
    areaCode,
    contentTypeId,
    cat1,
    cat2,
    cat3,
    keyword,
    pageNo,
    numOfRows,
    mode,
    contentid,
  ]);

  if (mode === "detail") {
    return { detail, loading, error };
  }
  return { places, loading, error, totalCount };
}
// tour api 연동
