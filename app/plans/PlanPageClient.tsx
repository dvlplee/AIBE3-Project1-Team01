"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import type { DateRange } from "react-day-picker";
import PlanForm from "./components/PlanForm";
import DayInputs from "./components/DayInputs";
import LoginModal from "../login/LoginModal";
import SignupModal from "../signup/SignupModal";
import Header from "../components/Header";
import { format } from "date-fns";
import AlertModal from "./components/AlertModal";

export default function PlanPage() {
  const [range, setRange] = useState<DateRange | undefined>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dailyPlans, setDailyPlans] = useState<{
    [date: string]: { place: string; detail: string }[];
  }>({});
  const router = useRouter();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const planId = searchParams.get("id");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [dateError, setDateError] = useState("");

  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);

  const showAlertModal = (message: string) => {
    setAlertMessage(message);
    setShowAlert(true);
  };

  const handleSwitchToSignup = () => {
    setShowLoginModal(false);
    setShowSignupModal(true);
  };

  const handleSwitchToLogin = () => {
    setShowSignupModal(false);
    setShowLoginModal(true);
  };

  useEffect(() => {
    const fetchPlan = async () => {
      if (!planId) return;

      const { data: plan, error: planError } = await supabase
        .from("plans")
        .select("*")
        .eq("id", planId)
        .eq("user_id", user?.id)
        .single();

      if (planError || !plan) return;

      setTitle(plan.title);
      setDescription(plan.description);
      setRange({
        from: new Date(plan.start_date),
        to: new Date(plan.end_date),
      });

      const { data: items } = await supabase
        .from("plan_items")
        .select("*")
        .eq("plan_id", planId)
        .order("order", { ascending: true });

      const grouped: { [date: string]: { place: string; detail: string }[] } =
        {};
      items?.forEach((item) => {
        if (!grouped[item.date]) grouped[item.date] = [];
        grouped[item.date].push({ place: item.place, detail: item.detail });
      });

      setDailyPlans(grouped);
    };

    fetchPlan();
  }, [planId]);

  useEffect(() => {
    if (user === undefined) return;
    if (!user) router.push("/");
  }, [user, router]);

  const handleSave = async () => {
    if (!range || !range.from || !range.to) {
      setDateError("날짜는 반드시 선택해야 합니다.");
      return;
    }
    setDateError("");

    if (planId) {
      const { error: updateError } = await supabase
        .from("plans")
        .update({
          title,
          description,
          start_date: format(range.from, "yyyy-MM-dd"),
          end_date: format(range.to, "yyyy-MM-dd"),
        })
        .eq("id", planId)
        .eq("user_id", user?.id);

      if (updateError) {
        showAlertModal("계획 수정 실패");
        return;
      }

      await supabase.from("plan_items").delete().eq("plan_id", planId);

      const itemsToInsert = Object.entries(dailyPlans).flatMap(
        ([date, entries]) =>
          entries.map((entry, idx) => ({
            date,
            place: entry.place,
            detail: entry.detail,
            order: idx,
            plan_id: planId,
          }))
      );

      await supabase.from("plan_items").insert(itemsToInsert);
      router.push(`/plans/${planId}`);
    } else {
      const { data: planInsertData, error: planInsertError } = await supabase
        .from("plans")
        .insert({
          title,
          description,
          start_date: format(range.from, "yyyy-MM-dd"),
          end_date: format(range.to, "yyyy-MM-dd"),
          user_id: user?.id,
        })
        .select()
        .single();

      if (planInsertError || !planInsertData) {
        showAlertModal("저장 실패");
        return;
      }

      const newPlanId = planInsertData.id;

      const itemsToInsert = Object.entries(dailyPlans).flatMap(
        ([date, entries]) =>
          entries.map((entry, idx) => ({
            date,
            place: entry.place,
            detail: entry.detail,
            order: idx,
            plan_id: newPlanId,
          }))
      );

      await supabase.from("plan_items").insert(itemsToInsert);
      router.push(`/plans/${newPlanId}`);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#F6EFEF] py-7">
        <div className="container mx-auto p-6 max-w-6xl">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* 왼쪽: 여행 정보 입력 */}
            <div className="w-full md:w-[380px]">
              <PlanForm
                range={range}
                setRange={setRange}
                title={title}
                setTitle={setTitle}
                description={description}
                setDescription={setDescription}
              />
            </div>

            {/* 오른쪽: 일정 입력 + 버튼 */}
            <div className="w-full flex-1">
              <DayInputs
                range={range}
                dailyPlans={dailyPlans}
                setDailyPlans={setDailyPlans}
              />
              <div className="text-right mt-6 flex justify-end gap-3">
                {planId && (
                  <button
                    onClick={() => router.back()}
                    className="px-6 py-2 bg-gray-200 text-gray-600 font-semibold rounded-2xl shadow hover:bg-gray-300 transition-all"
                  >
                    취소
                  </button>
                )}
                <button
                  onClick={handleSave}
                  className="px-8 py-3 bg-[#F4CCC4] text-[#2B2323] font-bold rounded-2xl shadow-lg transition-all text-lg"
                >
                  {planId ? "수정하기" : "저장하기"}
                </button>
              </div>
              {dateError && (
                <p className="text-red-500 text-xs mt-2 text-right">
                  {dateError}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 모달들 */}
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onSignup={handleSwitchToSignup}
        />
        <SignupModal
          isOpen={showSignupModal}
          onClose={() => setShowSignupModal(false)}
          onLogin={handleSwitchToLogin}
        />
        <AlertModal
          isOpen={showAlert}
          message={alertMessage}
          onClose={() => setShowAlert(false)}
        />
      </div>

      <footer className="bg-white/60 backdrop-blur-md py-9 text-sm text-gray-600 mt-auto relative px-6 flex items-center">
        <div
          className="absolute inset-y-0 left-16 w-40 bg-no-repeat bg-left bg-contain pointer-events-none"
          style={{ backgroundImage: "url('/images/h1trip-logo.png')" }}
        />
        <p className="relative z-10 text-center w-full">
          © 2025 h1 Trip. 모든 여행자들의 꿈을 응원합니다. 🌟
        </p>
      </footer>
    </>
  );
}
