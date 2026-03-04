import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, FileText, CheckCircle2, Clock, Plus, Search, 
  Trash2, Edit2, X, Save, TrendingUp, Download, Loader2, 
  History, PlusCircle, ShieldCheck, LogOut, LogIn, UserPlus, Lock, Mail,
  FileSearch, Printer, Copy, FileCheck, AlertCircle, Map as MapIcon, KeyRound,
  ArrowLeft, PlusSquare, MinusCircle, FileEdit, CloudUpload, Calendar, ChevronLeft, MessageSquare, ArrowUp, ArrowDown, AlignLeft, AlignCenter, AlignJustify, Bold, Palette, Eraser,
  Paperclip, ExternalLink, Users,
  User, Shield, Calculator, Landmark, PenTool
} from 'lucide-react';

// Firebase SDK
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, updateDoc, deleteDoc, 
  doc, onSnapshot, query, where, getDoc, setDoc,
  collectionGroup, getDocs
} from 'firebase/firestore';
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
  signOut, onAuthStateChanged, signInWithCustomToken,
  GoogleAuthProvider, signInWithPopup
} from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// --- 환경 설정 ---
const firebaseConfig = {
  apiKey: "AIzaSyC7Gv3jnERw87BkZAQQk1EWRVW1EwKnr5k",
  authDomain: "claim-2fb81.firebaseapp.com",
  projectId: "claim-2fb81",
  storageBucket: "claim-2fb81.firebasestorage.app",
  messagingSenderId: "1087665156009",
  appId: "1:1087665156009:web:df45f233645de082229eb8",
  measurementId: "G-PKXRL09Y1V"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'claims-saas-v2';

// --- 유틸리티: 숫자 콤마 포맷팅 ---
const formatComma = (val) => {
  if (!val && val !== 0) return "";
  const num = val.toString().replace(/[^0-9]/g, "");
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const unformatComma = (val) => {
  if (typeof val !== 'string') return val;
  const num = val.replace(/[^0-9]/g, "");
  return Number(num) || 0;
};

// --- 유틸리티: Firestore 저장용 데이터 정제 (undefined 제거) ---
const cleanData = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(v => (v && typeof v === 'object') ? cleanData(v) : v);
  }
  const newObj = {};
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    if (value !== undefined) {
      newObj[key] = (value && typeof value === 'object') ? cleanData(value) : value;
    }
  });
  return newObj;
};

const formatPhone = (val) => {
  if (!val) return "";
  return val.replace(/[^0-9]/g, "");
};

const getDiffDays = (start, end) => {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  const diff = e - s;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  return days > 0 ? days : 0;
};

const calculateWorkMonths = (birthDate, accidentDate) => {
  if (!birthDate || !accidentDate) return 0;
  const birth = new Date(birthDate);
  const accident = new Date(accidentDate);
  if (isNaN(birth.getTime()) || isNaN(accident.getTime())) return 0;
  const retirementDate = new Date(birth.getFullYear() + 65, birth.getMonth(), birth.getDate());
  
  if (accident >= retirementDate) return 0;
  
  let months = (retirementDate.getFullYear() - accident.getFullYear()) * 12;
  months += retirementDate.getMonth() - accident.getMonth();
  if (retirementDate.getDate() < accident.getDate()) months--;
  
  return months > 0 ? months : 0;
};

const calculateHoffman = (months) => {
  const m = Math.floor(Number(months) || 0);
  if (m <= 0) return 0;
  let total = 0;
  const monthlyRate = 0.05 / 12; // 연 5% 단리 기준 월 이율
  
  for (let i = 1; i <= m; i++) {
    total += 1 / (1 + i * monthlyRate);
  }
  
  // 호프만 계수는 일반적으로 240을 초과할 수 없음 (실무 원칙)
  return Number(Math.min(total, 240).toFixed(4));
};

// --- 리포트용 헬퍼 컴포넌트 ---
const InputGroup = ({ label, children }) => (
  <div className="space-y-1">
    <label className="text-xs font-bold text-slate-500 ml-1">{label}</label>
    {children}
  </div>
);

const FormSection = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-8 overflow-hidden">
    <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon size={18} className="text-blue-600" />
        <h3 className="text-[13pt] font-bold text-slate-800">{title}</h3>
      </div>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const RichTextEditor = ({ value, onChange, className = "" }) => {
  const editorRef = useRef(null);
  const savedRange = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== (value || "")) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const handleInput = () => {
    onChange(editorRef.current.innerHTML);
  };

  const exec = (command, arg) => {
    if (editorRef.current) {
      const sel = window.getSelection();
      const range = savedRange.current ? savedRange.current : (sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null);

      // 포커스를 먼저 주고 나서 선택 영역을 복구해야 드래그가 유지됨
      editorRef.current.focus();
      if (range) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
      
      if (command === 'fontSize') {
        document.execCommand('styleWithCSS', null, false);
        document.execCommand('fontSize', false, '7');
        const fontEls = editorRef.current.querySelectorAll('font[size="7"], font[size="+4"], span[style*="xxx-large"]');
        fontEls.forEach(el => {
          if (el.tagName === 'FONT') el.removeAttribute('size');
          el.style.fontSize = arg;
        });
      } else {
        document.execCommand('styleWithCSS', null, true);
        document.execCommand(command, false, arg);
      }
    }

    handleInput();
    savedRange.current = null;
  };

  return (
    <div className="border rounded-md overflow-hidden bg-white">
      <div className="bg-slate-50 p-1 border-b flex items-center gap-1 flex-wrap">
        <select 
          onMouseDown={() => {
            const sel = window.getSelection();
            if (sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange();
          }}
          onChange={(e) => { 
            let val = e.target.value;
            if (val === 'custom') {
              const customSize = window.prompt("글자 크기를 입력하세요 (숫자만 입력 시 pt로 적용됩니다)", "11");
              if (customSize) val = isNaN(customSize) ? customSize : customSize + 'pt';
              else { e.target.value = ""; return; }
            }
            exec('fontSize', val); 
            e.target.value = ""; 
            e.target.blur(); // 드롭다운 포커스 해제
          }}
          className="text-[10px] font-bold p-1 rounded border bg-white outline-none w-20"
          value=""
        >
          <option value="" disabled>크기(pt)</option>
          <option value="custom">직접 입력</option>
          {['9pt', '10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '24pt'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div className="h-4 w-[1px] bg-slate-300 mx-1" />
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('bold')} className="p-1 hover:bg-slate-200 rounded text-xs font-bold w-6 h-6">B</button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('underline')} className="p-1 hover:bg-slate-200 rounded text-xs underline w-6 h-6">U</button>
        <div className="h-4 w-[1px] bg-slate-300 mx-1" />
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('justifyLeft')} className="p-1 hover:bg-slate-200 rounded" title="왼쪽 정렬"><AlignLeft size={14}/></button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('justifyCenter')} className="p-1 hover:bg-slate-200 rounded" title="가운데 정렬"><AlignCenter size={14}/></button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('justifyFull')} className="p-1 hover:bg-slate-200 rounded" title="양쪽 정렬"><AlignJustify size={14}/></button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onBlur={() => {
          const sel = window.getSelection();
          if (sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0);
        }}
        onInput={handleInput}
        className={`p-3 min-h-[100px] text-sm focus:outline-none ${className}`}
      />
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login'); 
  const previewSavedRange = useRef(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [googleToken, setGoogleToken] = useState(null);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);

  const [quickEvent, setQuickEvent] = useState({
    scheduleTitle: '',
    scheduleDate: new Date().toISOString().split('T')[0],
    scheduleTime: new Date().toTimeString().slice(0, 5),
    scheduleDesc: ''
  });

  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signUpData, setSignUpData] = useState({
    email: '', password: '', passwordConfirm: '',
    name: '', phone: '', company: '', position: '', address: '', detailAddress: '', licenseNo: '', licenseType: ''
  });

  // 구글 로그인 후 최초 1회 추가 정보 입력 상태
  const [setupData, setSetupData] = useState({
    name: '', phone: '', company: '', position: '', address: '', detailAddress: '', licenseNo: '', licenseType: ''
  });

  const [isAddrOpen, setIsAddrOpen] = useState(false);
  const [view, setView] = useState('dashboard');
  const [cases, setCases] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('전체');
  
  const [pendingUsers, setPendingUsers] = useState([]);

  // 상담일지 상태
  const [consultations, setConsultations] = useState([]);
  const [consultationSearch, setConsultationSearch] = useState('');
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [editingConsultation, setEditingConsultation] = useState({
    date: new Date().toISOString().split('T')[0],
    clientName: '',
    phone: '',
    content: '',
    status: '상담중'
  });

  // 리포트 스타일 및 개별 문단 스타일 상태
  const [reportStyles, setReportStyles] = useState({
    lineHeight: '1.6'
  });
  const [customStyles, setCustomStyles] = useState({});
  const [selectedElementId, setSelectedElementId] = useState(null);

  // 리포트 리스트 아이템 이동 함수
  const moveReportListItem = (path, index, direction) => {
    const keys = path.split('.');
    setReportData(prev => {
      const newData = { ...prev };
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      const list = [...current[keys[keys.length - 1]]];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex >= 0 && newIndex < list.length) {
        [list[index], list[newIndex]] = [list[newIndex], list[index]];
        current[keys[keys.length - 1]] = list;
      }
      return newData;
    });
  };

  // 할 일(To-Do) 상태
  const [todos, setTodos] = useState([]);
  const [todoInput, setTodoInput] = useState('');
  const [selectedTodoDate, setSelectedTodoDate] = useState(new Date().toISOString().split('T')[0]);

  // 사건 수정용 상세 상태 (이미지 기반 복구)
  const [editingCase, setEditingCase] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [diagInput, setDiagInput] = useState('');

  // 손해사정서 작성 상태
  const [selectedCaseForReport, setSelectedCaseForReport] = useState(null);
  const [reportTab, setReportTab] = useState('input');
  const [activeCalcField, setActiveCalcField] = useState(null); // 계산기 모달 상태
  const [reportData, setReportData] = useState({
    reportType: "liability", // liability(배상), longTerm(장기), medical(실손), auto(자동차)
    reportTitle: "손 해 사 정 서",
    company: { name: "", address: "", repName: "", repPhone: "", regNo: "", investigator: "", investigatorPhone: "", investigatorRegNo: "", stampUrl: "" },
    engagement: {
      assignedDate: "", content: "",
      mandator: { name: "", birthDate: "", residentNo: "", phone: "", address: "", job: "", relation: "" },
      victim: { name: "", birthDate: "", residentNo: "", phone: "", address: "", job: "", relation: "" }
    },
    policy: {
      insurer: "", item: "", productName: "", policyNo: "", contractor: "", insured: "",
      address: "", phone: "", period: "", limitDeductible: "", coverageDetails: "", otherDetails: ""
    },
    accident: {
      overview: "", time: "", place: "", cause: "", details: "", investigationDetails: ""
    },
    damage: {
      hospital: "", diagnosis: "", treatment: ""
    },
    liability: {
      liabilityStatus: "", policyLiabilityBasis: [], legalLiabilityBasis: [], faultPercent: 0, paymentLiability: []
    },
    assessment: {
      medicalExpenses: 0, futureMedicalExpenses: 0, lostWages: 0, lostEarnings: 0, nursingExpenses: 0, transportationExpenses: 0, alimony: 0, otherDamages: 0
    },
    assessmentDetails: {}, // 상세 산출 내역 저장
    processLogs: [],
    fees: { basic: 0, mileage: 0, fuelPrice: 0, efficiency: 0, toll: 0, misc: 0, daily: 0 },
    bankInfo: { accountHolder: "", birthDate: "", bankName: "", accountNumber: "" }
  });

  const [standaloneCalc, setStandaloneCalc] = useState({
    medicalExpenses: 0, futureMedicalExpenses: 0, lostWages: 0, lostEarnings: 0, nursingExpenses: 0, transportationExpenses: 0, alimony: 0, otherDamages: 0, roundingDeduction: 0, faultPercent: 0,
    hospStartDate: '', hospEndDate: '', outStartDate: '', outEndDate: '',
    accidentDate: '', victimName: '', birthDate: '', occupation: '', monthlyIncome: 0,
    diagnosis: '', hospDays: 0, outDays: 0, initialWeeks: 0,
    injuryGrade: '', disabilityGrade: '', lossRate: 0, workMonths: 0, hoffman: 0,
    lostWagesMultiplier: 0.85,
    lostWagesDays: 0,
    lostWagesIncome: 0,
    lostEarningsIncome: 0,
    lostEarningsRate: 0,
    lostEarningsHoffman: 0,
    isLostWagesManual: false,
    isLostEarningsManual: false,
    lostWagesPeriods: [{ income: 0, days: 0, multiplier: 0.85 }],
    lostEarningsPeriods: [{ income: 0, rate: 0, hoffman: 0 }],
    nursingDays: 0,
    nursingDailyWage: 0,
    transportationDays: 0,
    transportationDailyRate: 8000
  });
  const [selectedCalcCaseId, setSelectedCalcCaseId] = useState('');
  const [selectedReportCaseId, setSelectedReportCaseId] = useState('');

  // --- 지급책임 검토용 입력 상태 및 라이브러리 ---
  const [newPolicyBasis, setNewPolicyBasis] = useState({ title: '', content: '' });
  const [newLegalBasis, setNewLegalBasis] = useState({ title: '', content: '' });
  const [newPayLiab, setNewPayLiab] = useState({ title: '', content: '' });

  const [liabilityLibrary, setLiabilityLibrary] = useState([
    { title: '지급책임의 발생', content: '본 건 사고는 피보험자의 업무 수행 중 발생한 사고로, 약관상 보상하는 손해에 해당하여 보험사의 보험금 지급책임이 발생함.' },
    { title: '약관상 보상책임', content: '해당 보험계약의 보통약관 및 특별약관 규정에 의거, 피보험자가 피해자에게 부담하는 법률상 배상책임을 담보하므로 지급책임이 인정됨.' },
    { title: '면책사항 검토', content: '사고 경위 조사 결과, 약관에서 정한 고의 또는 중과실 등 면책사유에 해당하지 않음을 확인하였음.' },
    { title: '보험금 지급의 결정', content: '사고 경위 및 손해 정도를 종합적으로 고려하여 다음과 같이 보험금을 산정함.' },
    { title: '손해배상금의 산정', content: '피해자의 소득, 장해율, 과실비율 등을 종합적으로 검토하여 약관상 지급기준에 따라 손해액을 산출함.' }
  ]);

  const handleSaveStandaloneCalc = async () => {
    if (!user || !selectedCalcCaseId) {
      alert("저장할 고객(사건)을 먼저 선택해주세요.");
      return;
    }
    try {
      setLoading(true);
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'cases', selectedCalcCaseId), {
        standaloneCalcData: cleanData(standaloneCalc)
      });
      alert("산출 데이터가 고객 정보에 저장되었습니다.");
    } catch (err) {
      alert("저장 실패: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadStandaloneCalc = () => {
    if (!selectedCalcCaseId) {
      alert("불러올 고객(사건)을 선택해주세요.");
      return;
    }
    const targetCase = cases.find(c => c.id === selectedCalcCaseId);
    if (!targetCase) return;

    if (targetCase.standaloneCalcData) {
      const data = targetCase.standaloneCalcData;
      setStandaloneCalc({
        ...data,
        lostWagesDays: data.lostWagesDays !== undefined ? data.lostWagesDays : (data.hospDays || 0),
        lostWagesIncome: data.lostWagesIncome || data.monthlyIncome || 0,
        lostEarningsIncome: data.lostEarningsIncome || data.monthlyIncome || 0,
        lostEarningsRate: data.lostEarningsRate || data.lossRate || 0,
        lostEarningsHoffman: data.lostEarningsHoffman || data.hoffman || 0,
        isLostWagesManual: data.isLostWagesManual || false,
        isLostEarningsManual: data.isLostEarningsManual || false,
        lostWagesPeriods: data.lostWagesPeriods || [{ income: data.lostWagesIncome || data.monthlyIncome || 0, days: data.lostWagesDays || 0, multiplier: data.lostWagesMultiplier || 0.85 }],
        lostEarningsPeriods: data.lostEarningsPeriods || [{ income: data.lostEarningsIncome || data.monthlyIncome || 0, rate: data.lostEarningsRate || data.lossRate || 0, hoffman: data.lostEarningsHoffman || data.hoffman || 0 }],
        nursingDailyWage: data.nursingDailyWage || 0,
        nursingExpenses: data.nursingExpenses || 0,
        nursingDays: data.nursingDays || 0,
        transportationExpenses: data.transportationExpenses || 0,
        transportationDays: data.transportationDays !== undefined ? data.transportationDays : (data.outDays || 0),
        transportationDailyRate: data.transportationDailyRate || 8000,
        otherDamages: data.otherDamages || 0,
        roundingDeduction: data.roundingDeduction || 0
      });
    } else {
      setStandaloneCalc({
        medicalExpenses: 0, futureMedicalExpenses: 0, lostWages: 0, lostEarnings: 0, nursingExpenses: 0, transportationExpenses: 0, alimony: 0, otherDamages: 0, roundingDeduction: 0, faultPercent: 0,
        hospStartDate: '', hospEndDate: '', outStartDate: '', outEndDate: '',
        accidentDate: targetCase.incidentDiagnosisDate || targetCase.receptionDate || '',
        victimName: targetCase.clientName || '',
        birthDate: targetCase.birthDate || '', occupation: targetCase.occupation || '', monthlyIncome: 0,
        diagnosis: (targetCase.diagnoses || []).join(', '),
        hospDays: 0, outDays: 0, initialWeeks: targetCase.initialWeeks || 0,
        injuryGrade: targetCase.injuryGrade || '', disabilityGrade: targetCase.disabilityGrade || '', lossRate: 0, workMonths: 0, hoffman: 0,
        lostWagesMultiplier: 0.85,
        lostWagesDays: 0,
        lostWagesIncome: 0,
        lostEarningsIncome: 0,
        lostEarningsRate: 0,
        lostEarningsHoffman: 0,
        isLostWagesManual: false,
        isLostEarningsManual: false,
        lostWagesPeriods: [{ income: 0, days: 0, multiplier: 0.85 }],
        lostEarningsPeriods: [{ income: 0, rate: 0, hoffman: 0 }],
        nursingDays: 0,
        nursingDailyWage: 0,
        transportationDays: targetCase.outDays || 0,
        transportationDailyRate: 8000
      });
    }
  };

  const handleLoadReportCase = () => {
    if (!selectedReportCaseId) {
      alert("불러올 고객(사건)을 선택해주세요.");
      return;
    }
    const targetCase = cases.find(c => c.id === selectedReportCaseId);
    if (targetCase) {
      startReport(targetCase);
    }
  };

  // 상해급수 변경 시 간병일수 자동 세팅 (기준값)
  useEffect(() => {
    const gradeNum = parseInt(standaloneCalc.injuryGrade?.toString().replace(/[^0-9]/g, ""));
    if (!isNaN(gradeNum)) {
      let days = 0;
      if (gradeNum >= 1 && gradeNum <= 2) days = 60;
      else if (gradeNum >= 3 && gradeNum <= 4) days = 30;
      else if (gradeNum === 5) days = 15;
      
      if (days > 0) {
        setStandaloneCalc(prev => ({ ...prev, nursingDays: days }));
      }
    }
  }, [standaloneCalc.injuryGrade]);

  // 통원일수 변경 시 교통비 일수 자동 세팅
  useEffect(() => {
    setStandaloneCalc(prev => ({ ...prev, transportationDays: prev.outDays }));
  }, [standaloneCalc.outDays]);

  // --- 손해배상금 자동 계산 통합 로직 ---
  useEffect(() => {
    let lostWages = 0;
    if (standaloneCalc.isLostWagesManual) {
      lostWages = (standaloneCalc.lostWagesPeriods || []).reduce((sum, p) => {
        return sum + Math.floor((Number(p.income) || 0) / 30 * (Number(p.days) || 0) * (Number(p.multiplier) || 0.85));
      }, 0);
    } else {
      const income = Number(standaloneCalc.monthlyIncome) || 0;
      const days = Number(standaloneCalc.lostWagesDays) || 0;
      const multiplier = (standaloneCalc.lostWagesMultiplier === '' || standaloneCalc.lostWagesMultiplier === undefined) ? 0.85 : Number(standaloneCalc.lostWagesMultiplier);
      lostWages = Math.floor((income / 30) * days * multiplier);
    }

    let lostEarnings = 0;
    if (standaloneCalc.isLostEarningsManual) {
      lostEarnings = (standaloneCalc.lostEarningsPeriods || []).reduce((sum, p) => {
        return sum + Math.floor((Number(p.income) || 0) * ((Number(p.rate) || 0) / 100) * (Number(p.hoffman) || 0));
      }, 0);
    } else {
      const income = Number(standaloneCalc.monthlyIncome) || 0;
      const rate = Number(standaloneCalc.lossRate) || 0;
      const hoffman = Number(standaloneCalc.hoffman) || 0;
      lostEarnings = Math.floor(income * (rate / 100) * hoffman);
    }

    // 간병비 계산 (수동 입력 임금 우선, 없으면 월소득/25)
    const dailyRate = standaloneCalc.nursingDailyWage > 0 ? standaloneCalc.nursingDailyWage : Math.floor((Number(standaloneCalc.monthlyIncome) || 0) / 25);
    const nursingExpenses = (Number(standaloneCalc.nursingDays) || 0) * dailyRate;

    // 교통비 계산 (단가 * 일수)
    const transDays = Number(standaloneCalc.transportationDays) || 0;
    const transRate = Number(standaloneCalc.transportationDailyRate) || 8000;
    const transportationExpenses = transDays * transRate;

    // 위자료 자동 계산 (부상 vs 후유장해 중 높은 금액)
    const gradeNum = parseInt(standaloneCalc.injuryGrade?.toString().replace(/[^0-9]/g, ""));
    let injuryAlimony = 0;
    if (!isNaN(gradeNum)) {
      const injuryTable = {
        1: 2000000, 2: 1760000, 3: 1520000, 4: 1280000, 5: 750000,
        6: 500000, 7: 400000, 8: 300000, 9: 250000, 10: 200000,
        11: 200000, 12: 150000, 13: 150000, 14: 150000
      };
      injuryAlimony = injuryTable[gradeNum] || 0;
    }

    const lossRateVal = Number(standaloneCalc.lossRate) || 0;
    let disabilityAlimony = 0;

    // 장해 위자료 산출 (자동차보험 약관 기준)
    if (lossRateVal >= 50) {
      // 50% 이상: 4,500만원 * 상실률 * 85% (65세 미만 기준)
      disabilityAlimony = Math.floor(45000000 * (lossRateVal / 100) * 0.85);
    } else if (lossRateVal > 0) {
      // 50% 미만: 등급별 정액 기준
      if (lossRateVal >= 45) disabilityAlimony = 4000000;
      else if (lossRateVal >= 35) disabilityAlimony = 2400000;
      else if (lossRateVal >= 27) disabilityAlimony = 2000000;
      else if (lossRateVal >= 20) disabilityAlimony = 1600000;
      else if (lossRateVal >= 14) disabilityAlimony = 1200000;
      else if (lossRateVal >= 9) disabilityAlimony = 1000000;
      else if (lossRateVal >= 5) disabilityAlimony = 800000;
      else disabilityAlimony = 500000;
    }

    // 부상위자료와 장해위자료 중 높은 금액 선택
    const calculatedAlimony = Math.max(injuryAlimony, disabilityAlimony);
    
    if (standaloneCalc.lostWages !== lostWages || standaloneCalc.lostEarnings !== lostEarnings || 
        standaloneCalc.nursingExpenses !== nursingExpenses || standaloneCalc.transportationExpenses !== transportationExpenses ||
        standaloneCalc.alimony !== calculatedAlimony) {
      setStandaloneCalc(prev => ({ 
        ...prev, 
        lostWages, 
        lostEarnings, 
        nursingExpenses,
        transportationExpenses,
        alimony: calculatedAlimony
      }));
    }
  }, [
    standaloneCalc.monthlyIncome, standaloneCalc.lostWagesDays, standaloneCalc.lostWagesMultiplier, 
    standaloneCalc.isLostWagesManual, standaloneCalc.lostWagesPeriods,
    standaloneCalc.lossRate, standaloneCalc.hoffman, standaloneCalc.isLostEarningsManual, standaloneCalc.lostEarningsPeriods,
    standaloneCalc.injuryGrade,
    standaloneCalc.nursingDays, standaloneCalc.nursingDailyWage,
    standaloneCalc.transportationDays, standaloneCalc.transportationDailyRate
  ]);

  const standaloneResult = useMemo(() => {
    const { medicalExpenses, futureMedicalExpenses, lostWages, lostEarnings, nursingExpenses, transportationExpenses, alimony, otherDamages, roundingDeduction, faultPercent } = standaloneCalc;
    const subTotal = (Number(medicalExpenses)||0) + (Number(futureMedicalExpenses)||0) + (Number(lostWages)||0) + (Number(lostEarnings)||0) + (Number(nursingExpenses)||0) + (Number(transportationExpenses)||0) + (Number(alimony)||0) + (Number(otherDamages)||0);
    const faultOffset = Math.floor(subTotal * ((Number(faultPercent)||0) / 100));
    const finalPayment = subTotal - faultOffset - (Number(roundingDeduction)||0);
    return { subTotal, faultOffset, finalPayment };
  }, [standaloneCalc]);

  // --- 리포트 자동 계산 ---
  const calcs = useMemo(() => {
    const { medicalExpenses, futureMedicalExpenses, lostWages, lostEarnings, nursingExpenses, transportationExpenses, alimony, otherDamages } = reportData.assessment;
    const subTotal = (Number(medicalExpenses)||0) + (Number(futureMedicalExpenses)||0) + (Number(lostWages)||0) + (Number(lostEarnings)||0) + (Number(nursingExpenses)||0) + (Number(transportationExpenses)||0) + (Number(alimony)||0) + (Number(otherDamages)||0);
    // 장기/실손 보험은 과실상계 미적용
    const fault = (reportData.reportType?.startsWith('longTerm') || reportData.reportType === 'medical') ? 0 : (Number(reportData.liability.faultPercent) || 0);
    const faultOffset = Math.floor(subTotal * (fault / 100));
    const finalPayment = subTotal - faultOffset;
    
    const transFee = Math.floor(((Number(reportData.fees.mileage)||0) * (Number(reportData.fees.fuelPrice)||0) / (Number(reportData.fees.efficiency)||1)) + (Number(reportData.fees.toll)||0));
    const totalFees = (Number(reportData.fees.basic)||0) + transFee + (Number(reportData.fees.misc)||0) + (Number(reportData.fees.daily)||0);

    return { subTotal, faultOffset, finalPayment, transFee, totalFees };
  }, [reportData]);

  // --- 리포트 데이터 수정 헬퍼 ---
  const updateReportField = (path, value) => {
    const keys = path.split('.');
    setReportData(prev => {
      let newData = { ...prev };
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const updateReportListIndex = (path, index, field, value) => {
    const keys = path.split('.');
    setReportData(prev => {
      const newData = { ...prev };
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]][index] = { ...current[keys[keys.length - 1]][index], [field]: value };
      return newData;
    });
  };

  const addReportItem = (listName, emptyItem) => {
    updateReportField(listName, [...(reportData[listName]||[]), { ...emptyItem, id: Date.now() }]);
  };

  const removeReportItem = (listName, id) => {
    updateReportField(listName, reportData[listName].filter(item => item.id !== id));
  };

  const updateReportListItem = (listName, id, field, value) => {
    updateReportField(listName, reportData[listName].map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // --- 주소 API 로드 ---
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    document.head.appendChild(script);
    return () => { if (document.head?.contains(script)) document.head.removeChild(script); };
  }, []);

  const handleOpenAddr = (callback) => {
    if (!window.daum || !window.daum.Postcode) return;
    setIsAddrOpen(true);
    setTimeout(() => {
      new window.daum.Postcode({
        oncomplete: (data) => {
          let fullAddr = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
          callback(fullAddr);
          setIsAddrOpen(false);
        },
        width: '100%',
        height: '100%'
      }).embed(document.getElementById('addr-layer'));
    }, 100);
  };

  // --- 인증 로직 ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        try { await signInWithCustomToken(auth, __initial_auth_token); } catch(e) {}
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setLoading(true);
        const profileRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'profile', 'info');
        const profileDoc = await getDoc(profileRef);
        if (profileDoc.exists()) {
          const data = profileDoc.data();
          setProfile(data);
          // 관리자 이메일(sopy1337@gmail.com)이거나 승인된 사용자인 경우 앱 진입 허용
          if (data.approved || currentUser.email === 'sopy1337@gmail.com') {
            setAuthMode('app');
          } else {
            setAuthMode('pending');
          }
        } else {
          setSignUpData(prev => ({ 
            ...prev, 
            email: currentUser.email || ''
          }));
          setAuthMode('signup'); // 구글 로그인 후 프로필 없으면 회원가입 폼으로 이동
        }
        setUser(currentUser);
      } else {
        setUser(null);
        setAuthMode('login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const uid = user?.uid;
      if (!uid) return;
      
      const profileInfo = {
        uid: uid,
        email: signUpData.email,
        name: signUpData.name,
        phone: signUpData.phone,
        company: signUpData.company,
        position: signUpData.position,
        address: signUpData.address,
        detailAddress: signUpData.detailAddress,
        licenseNo: signUpData.licenseNo,
        licenseType: signUpData.licenseType,
        approved: false, // 승인 대기 상태로 시작
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'artifacts', appId, 'users', uid, 'profile', 'info'), cleanData(profileInfo));
      setProfile(profileInfo);
      setAuthMode('pending');
    } catch (err) { setErrorMsg("가입 실패: " + err.message); }
    finally { setLoading(false); }
  };

  // --- 데이터 로드 ---
  useEffect(() => {
    if (!user) return;
    const userCasesCollection = collection(db, 'artifacts', appId, 'users', user.uid, 'cases');
    const unsubscribe = onSnapshot(userCasesCollection, (snapshot) => {
      setCases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  // --- 할 일 데이터 로드 ---
  useEffect(() => {
    if (!user) return;
    const todosCollection = collection(db, 'artifacts', appId, 'users', user.uid, 'todos');
    const q = query(todosCollection);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTodos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  // --- 상담일지 데이터 로드 ---
  useEffect(() => {
    if (!user) return;
    const consultationsCol = collection(db, 'artifacts', appId, 'users', user.uid, 'consultations');
    const unsubscribe = onSnapshot(consultationsCol, (snapshot) => {
      setConsultations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const handleSaveConsultation = async (data) => {
    if (!user || !data) return;
    try {
      if (data.id) {
        const { id, ...fields } = data;
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'consultations', id), cleanData(fields));
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'consultations'), cleanData({
          ...data,
          createdAt: new Date().toISOString()
        }));
      }
      setIsConsultationModalOpen(false);
      setEditingConsultation(null);
    } catch (err) { console.error(err); }
  };

  const handleDeleteConsultation = async (id) => {
    if (!user || !window.confirm("상담 기록을 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'consultations', id));
    } catch (err) { console.error(err); }
  };

  // --- 관리자 전용: 승인 대기자 조회 및 승인 핸들러 ---
  const fetchPendingUsers = async () => {
    try {
      // 모든 사용자의 'profile' 서브컬렉션에서 승인되지 않은 문서 검색
      // ※ 주의: Firebase 콘솔에서 'profile' 컬렉션 그룹에 대한 색인(Index) 생성이 필요할 수 있습니다.
      const q = query(collectionGroup(db, 'profile'), where('approved', '==', false));
      const querySnapshot = await getDocs(q);
      const users = querySnapshot.docs.map(doc => ({ 
        uid: doc.ref.parent.parent.id, 
        ...doc.data() 
      }));
      setPendingUsers(users);
    } catch (err) {
      console.error("대기자 명단 로드 실패:", err);
    }
  };

  const handleApproveUser = async (userId) => {
    try {
      const userRef = doc(db, 'artifacts', appId, 'users', userId, 'profile', 'info');
      await updateDoc(userRef, { approved: true });
      alert("사용자가 승인되었습니다.");
      fetchPendingUsers(); // 목록 갱신
    } catch (err) {
      alert("승인 처리 중 오류가 발생했습니다: " + err.message);
    }
  };

  useEffect(() => {
    if (view === 'admin' && profile?.email === 'sopy1337@gmail.com') {
      fetchPendingUsers();
    }
  }, [view, profile]);

  // --- 구글 로그인 핸들러 ---
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    // 로그인 시점에 캘린더 권한도 함께 요청하여 세션 전환 방지
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
    
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential) setGoogleToken(credential.accessToken);
    } catch (err) { 
      console.error(err);
      setErrorMsg("구글 로그인에 실패했습니다. 팝업 차단 여부를 확인하세요."); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleCompleteSetup = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      setLoading(true);
      const profileInfo = {
        uid: user.uid,
        email: user.email,
        name: setupData.name,
        phone: setupData.phone,
        company: setupData.company,
        position: setupData.position,
        address: setupData.address,
        detailAddress: setupData.detailAddress,
        licenseNo: setupData.licenseNo,
        licenseType: setupData.licenseType,
        approved: false, // 승인 대기 상태로 시작
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'info'), cleanData(profileInfo));
      setProfile(profileInfo);
      setAuthMode('pending');
    } catch (err) { 
      setErrorMsg("프로필 저장 실패: " + err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  // --- 구글 API 연동 핸들러 ---
  const handleConnectGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      setGoogleToken(credential.accessToken);
      alert("구글 캘린더 API 연동이 완료되었습니다.");
    } catch (error) {
      console.error("Google 연동 실패:", error.code, error.message);
      if (error.code === 'auth/popup-blocked') {
        alert("브라우저의 팝업 차단 기능이 활성화되어 있습니다. 주소창 옆의 아이콘을 클릭하여 팝업을 허용해 주세요.");
      } else if (error.code === 'auth/operation-not-allowed') {
        alert("Firebase 콘솔에서 Google 로그인이 활성화되어 있지 않습니다.");
      } else {
        alert(`연동에 실패했습니다: ${error.message}\nFirebase 콘솔의 '승인된 도메인' 설정에 현재 주소가 등록되어 있는지 확인하세요.`);
      }
    }
  };

  const saveToGoogleCalendarAPI = async (eventData) => {
    if (!googleToken) {
      alert("먼저 대시보드에서 '구글 API 연동'을 완료해주세요.");
      return;
    }

    const { scheduleDate, scheduleTime, scheduleTitle, scheduleDesc, address } = eventData;
    const start = new Date(`${scheduleDate}T${scheduleTime}`);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const event = {
      summary: scheduleTitle || '의뢰인 미팅',
      location: address || '',
      description: scheduleDesc || '',
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    };

    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      const result = await response.json();

      if (response.ok) {
        alert("일정이 캘린더에 즉시 저장되었습니다.");
        setCalendarRefreshKey(prev => prev + 1); // 달력 iframe 새로고침 트리거
      } else {
        console.error("Google API 상세 에러:", result);
        throw new Error(result.error?.message || "API 호출 실패");
      }
    } catch (error) {
      console.error("일정 저장 실패:", error);
      if (error.message.includes("API has not been used") || error.message.includes("disabled")) {
        alert("구글 캘린더 API가 활성화되지 않았습니다.\n\n1. 에러 메시지의 링크를 클릭해 '사용 설정'을 해주세요.\n2. 설정 후 반영까지 3~5분 정도 소요됩니다.");
        window.open(`https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview?project=${firebaseConfig.messagingSenderId}`, '_blank');
      } else {
        alert(`일정 저장 중 오류가 발생했습니다: ${error.message}`);
      }
    }
  };

  const handleOpenEditModal = (c) => {
    let insurances = c.insurances ? [...c.insurances] : [{
      insuranceType: c.insuranceType || '자동차보험',
      insuranceCompany: c.insuranceCompany,
      claimNumber: c.claimNumber,
      policyNumber: c.policyNumber,
      productName: c.productName,
      coverageName: c.coverageName,
      reviewerInfo: c.reviewerInfo,
      investigatorInfo: c.investigatorInfo,
      coverageDetails: c.coverageDetails || []
    }];
    if (c.insurances && c.coverageDetails?.length > 0 && !insurances[0].coverageDetails) {
        insurances[0] = { ...insurances[0], coverageDetails: c.coverageDetails };
    }
    setEditingCase({...c, insurances, coverageDetails: c.coverageDetails || [], attachments: c.attachments || []});
    setIsModalOpen(true);
  };

  // --- 사건 데이터 저장 (데이터 격리 및 보호) ---
  const handleSaveCase = async (formData) => {
    if (!user || !formData) return;
    
    // Sync first insurance to root for compatibility
    const dataToSave = { ...formData };
    if (dataToSave.insurances && dataToSave.insurances.length > 0) {
        const first = dataToSave.insurances[0];
        ['insuranceType', 'insuranceCompany', 'claimNumber', 'policyNumber', 'productName', 'coverageName', 'reviewerInfo', 'investigatorInfo', 'coverageDetails'].forEach(field => {
            if (first[field] !== undefined) {
                dataToSave[field] = first[field];
            }
        });
    }

    try {
      if (editingCase?.id) {
        const { reportContent: _, id: __, ...rawFields } = dataToSave;
        const updateFields = cleanData(rawFields);
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'cases', editingCase.id), updateFields);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'cases'), cleanData({ 
          ...dataToSave, 
          createdAt: new Date().toISOString(),
          logs: formData.logs || [],
          diagnoses: formData.diagnoses || [],
          reportContent: null 
        }));
      }
      setIsModalOpen(false);
      setEditingCase(null);
      setDiagInput('');
    } catch (err) { console.error(err); }
  };

  const handleSaveReportData = async () => {
    if (!user || !selectedCaseForReport) return;
    setIsSavingReport(true);
    try {
      const cleanedReportData = cleanData(reportData);
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'cases', selectedCaseForReport.id), { reportData: cleanedReportData });
      setCases(prev => prev.map(c => c.id === selectedCaseForReport.id ? { ...c, reportData } : c));
    } catch (err) { console.error(err); }
    finally { setTimeout(() => setIsSavingReport(false), 500); }
  };

  // --- 할 일 핸들러 ---
  const handleAddTodo = async () => {
    if (!todoInput.trim() || !user) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'todos'), {
        text: todoInput,
        date: selectedTodoDate,
        completed: false,
        createdAt: new Date().toISOString()
      });
      setTodoInput('');
    } catch (err) { console.error(err); }
  };

  const handleToggleTodo = async (todo) => {
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'todos', todo.id), { completed: !todo.completed });
  };

  const handleDeleteTodo = async (id) => {
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'todos', id));
  };

  // --- 통계 및 필터링 ---
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonthCases = cases.filter(c => {
      const dateToUse = c.receptionDate || c.createdAt;
      if (!dateToUse) return false;
      const d = new Date(dateToUse);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    return {
      total: cases.length,
      pending: cases.filter(c => c.status !== '종결').length,
      intake: currentMonthCases.length,
      closed: cases.filter(c => c.status === '종결').length,
      totalAmount: cases.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
    };
  }, [cases]);

  const filteredCases = cases.filter(c => {
    const diagStr = (c.diagnoses || []).join(' ');
    const searchStr = `${c.clientName || ''} ${diagStr} ${c.claimNumber || ''}`.toLowerCase();
    const matchesSearch = searchStr.includes(searchTerm.toLowerCase());

    if (statusFilter === '전체') return matchesSearch;
    if (statusFilter === '당월접수') {
      const dateToUse = c.receptionDate || c.createdAt;
      if (!dateToUse) return false;
      const d = new Date(dateToUse);
      const now = new Date();
      return matchesSearch && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (statusFilter === '미결') return matchesSearch && c.status !== '종결';
    if (statusFilter === '사정서작성') return matchesSearch && !!c.reportData;
    return matchesSearch && c.status === statusFilter;
  });

  const filteredTodos = useMemo(() => {
    return todos.filter(t => t.date === selectedTodoDate).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [todos, selectedTodoDate]);

  const startReport = (caseData) => {
    setSelectedCaseForReport(caseData);
    if (caseData.reportData) {
      const data = { ...caseData.reportData };
      if (data.liability) {
        if (data.liability.judgmentBasis && (!data.liability.policyLiabilityBasis || data.liability.policyLiabilityBasis.length === 0)) {
          data.liability.policyLiabilityBasis = [{ title: '약관상 근거', content: data.liability.judgmentBasis }];
        }
        if (data.liability.legalBasis && (!data.liability.legalLiabilityBasis || data.liability.legalLiabilityBasis.length === 0)) {
          data.liability.legalLiabilityBasis = [{ title: '법률상 근거', content: data.liability.legalBasis }];
        }
        if (data.liability.paymentResponsibility && (!data.liability.paymentLiability || data.liability.paymentLiability.length === 0)) {
          data.liability.paymentLiability = [{ title: '검토 의견', content: data.liability.paymentResponsibility }];
        }
      }
      setReportData(data);
    } else {
      // 보험 종목에 따른 리포트 타입 자동 설정
      let rType = 'liability';
      const iType = caseData.insurances?.[0]?.insuranceType;
      if (iType === '자동차보험') rType = 'auto';
      else if (iType === '장기보험(질병)') rType = 'longTermDisease';
      else if (iType === '장기보험(상해)') rType = 'longTermInjury';
      else if (iType === '실손보험' || iType === '선임권(실손)') rType = 'medical';

      // 기존 사건 정보로 리포트 데이터 초기화
      setReportData({
        reportType: rType,
        company: {
          name: profile?.company || "(주)○○ 손해사정",
          address: profile?.address || "",
          repName: profile?.name || "",
          repPhone: profile?.phone || "",
          regNo: profile?.licenseNo || "",
          investigator: profile?.name || "",
          investigatorPhone: profile?.phone || "",
          investigatorRegNo: "",
          stampUrl: profile?.stampUrl || ""
        },
        engagement: {
          assignedDate: new Date().toISOString().split('T')[0],
          content: "보험금 사정 위임",
          mandator: { name: caseData.clientName || "", birthDate: caseData.birthDate || "", residentNo: caseData.residentNo || "", phone: caseData.phone || "", address: caseData.address || "", job: "", relation: "본인" },
          victim: { name: caseData.clientName || "", birthDate: caseData.birthDate || "", residentNo: caseData.residentNo || "", phone: caseData.phone || "", address: caseData.address || "", job: "", relation: "본인" }
        },
        policy: {
          insurer: caseData.insuranceCompany || "",
          item: caseData.insurances?.[0]?.insuranceType || "",
          productName: caseData.insurances?.[0]?.productName || "",
          policyNo: caseData.insurances?.[0]?.policyNumber || "",
          contractor: caseData.contractor || "",
          insured: caseData.clientName || "",
          address: "", phone: "", period: "", limitDeductible: "", coverageDetails: caseData.insurances?.[0]?.coverageName || "", otherDetails: ""
        },
        accident: {
          overview: "",
          time: caseData.incidentDiagnosisDate ? `${caseData.incidentDiagnosisDate}T00:00` : "",
          place: "", cause: "", details: "", investigationDetails: ""
        },
        damage: {
          hospital: "", diagnosis: (caseData.diagnoses || []).join(", "), treatment: ""
        },
        liability: {
          liabilityStatus: "", policyLiabilityBasis: [], legalLiabilityBasis: [], faultPercent: 0, paymentLiability: []
        },
        assessment: {
            medicalExpenses: 0, futureMedicalExpenses: 0, lostWages: 0, lostEarnings: 0, nursingExpenses: 0, transportationExpenses: 0, alimony: 0, otherDamages: 0
        },
        assessmentDetails: {},
        processLogs: [],
        fees: { basic: 0, mileage: 0, fuelPrice: 0, efficiency: 0, toll: 0, misc: 0, daily: 0 },
        bankInfo: { accountHolder: caseData.clientName || "", birthDate: "", bankName: "", accountNumber: "" }
      });
    }
    setView('report');
    setReportTab('input');
  };

  const handleNewReport = () => {
    setSelectedCaseForReport({ clientName: '', insuranceCompany: '' });
    setReportData({
        reportType: "liability",
        company: { name: profile?.company || "(주)○○ 손해사정", address: profile?.address || "", repName: profile?.name || "", repPhone: "", regNo: "", investigator: "", investigatorPhone: "", investigatorRegNo: "", stampUrl: profile?.stampUrl || "" },
        engagement: {
          assignedDate: new Date().toISOString().split('T')[0], content: "",
          mandator: { name: "", birthDate: "", residentNo: "", phone: "", address: "", job: "", relation: "" },
          victim: { name: "", birthDate: "", residentNo: "", phone: "", address: "", job: "", relation: "" }
        },
        policy: {
          insurer: "", item: "", productName: "", policyNo: "", contractor: "", insured: "",
          address: "", phone: "", period: "", limitDeductible: "", coverageDetails: "", otherDetails: ""
        },
        accident: { overview: "", time: "", place: "", cause: "", details: "", investigationDetails: "" },
        damage: { hospital: "", diagnosis: "", treatment: "" },
        liability: { liabilityStatus: "", judgmentBasis: "", legalBasis: "", faultPercent: 0, paymentResponsibility: "" },
          assessment: { medicalExpenses: 0, futureMedicalExpenses: 0, lostWages: 0, lostEarnings: 0, nursingExpenses: 0, transportationExpenses: 0, alimony: 0, otherDamages: 0 },
        assessmentDetails: {},
        processLogs: [], fees: { basic: 0, mileage: 0, fuelPrice: 0, efficiency: 0, toll: 0, misc: 0, daily: 0 },
        bankInfo: { accountHolder: "", birthDate: "", bankName: "", accountNumber: "" }
    });
    setView('report');
    setReportTab('input');
  };

  // 진단명 관리
  const addDiagnosis = () => {
    if (!diagInput.trim()) return;
    setEditingCase(prev => ({ ...prev, diagnoses: [...(prev.diagnoses || []), diagInput.trim()] }));
    setDiagInput('');
  };

  const removeDiagnosis = (idx) => {
    setEditingCase(prev => ({ ...prev, diagnoses: prev.diagnoses.filter((_, i) => i !== idx) }));
  };

  // 파일 업로드 공통 로직
  const processFiles = async (fileList) => {
    const files = Array.from(fileList);
    if (!files.length || !user) return;

    setIsUploading(true);
    try {
      const uploadedFiles = [];
      for (const file of files) {
        const storageRef = ref(storage, `users/${user.uid}/cases/attachments/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploadedFiles.push({
          name: file.name,
          url: url,
          type: file.type,
          createdAt: new Date().toISOString()
        });
      }
      setEditingCase(prev => ({ 
        ...prev, 
        attachments: [...(prev?.attachments || []), ...uploadedFiles] 
      }));
    } catch (error) {
      alert("파일 업로드 실패: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (e) => {
    processFiles(e.target.files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const handleDelete = async (id) => {
    if (!user || !window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'cases', id));
    } catch (err) { console.error(err); }
  };

  // --- 데이터 백업 및 복구 기능 ---
  const handleBackup = () => {
    if (cases.length === 0) {
      alert("백업할 데이터가 없습니다.");
      return;
    }
    const backupData = {
      profile: profile,
      cases: cases,
      backupDate: new Date().toISOString(),
      version: "1.0"
    };
    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `E-UM_NEXUS_전체백업_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRestore = (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        const casesToRestore = data.cases || (Array.isArray(data) ? data : null);
        if (!casesToRestore || !Array.isArray(casesToRestore)) throw new Error("유효한 백업 파일이 아닙니다.");
        if (!window.confirm(`${casesToRestore.length}건의 데이터를 복구하시겠습니까? 기존 데이터와 병합됩니다.`)) return;
        setLoading(true);
        for (const c of casesToRestore) {
          const { id, ...caseData } = c;
          await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'cases'), caseData);
        }
        alert("데이터 복구가 완료되었습니다.");
      } catch (err) { alert("복구 실패: " + err.message); }
      finally { setLoading(false); }
    };
    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    if (cases.length === 0) return alert("내보낼 데이터가 없습니다.");
    const headers = ["접수일자", "의뢰인", "계약자", "보험사", "접수번호", "진단명", "상태", "예상수수료"];
    const rows = cases.map(c => [
      c.receptionDate || c.createdAt?.split('T')[0] || '',
      c.clientName || '', c.contractor || '', c.insuranceCompany || '',
      c.claimNumber || '', (c.diagnoses || []).join('/'), c.status || '미결', c.amount || 0
    ]);
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `사건관리대장_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleStampUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    try {
      const storageRef = ref(storage, `users/${user.uid}/stamps/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      updateReportField('company.stampUrl', downloadURL);
      
      const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'info');
      await setDoc(profileRef, { stampUrl: downloadURL }, { merge: true });
      setProfile(prev => ({ ...prev, stampUrl: downloadURL }));
    } catch (error) {
      console.error("Error uploading stamp:", error);
      alert("도장 이미지 업로드 실패: " + error.message);
    }
  };

  const assessmentLabels = {
    medicalExpenses: '치료관계비',
    futureMedicalExpenses: '향후치료비',
    lostWages: '휴업손해액',
    lostEarnings: '상실수익액',
    nursingExpenses: '간병비',
    transportationExpenses: '교통비',
    alimony: '위자료',
    otherDamages: '기타'
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-black animate-pulse">SYSTEM LOADING...</div>;

  // --- 인증 화면 (회원가입/로그인/비밀번호찾기) ---
  if (authMode !== 'app') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans overflow-y-auto">
        {isAddrOpen && (
          <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                <span className="font-black text-sm text-slate-800">주소 찾기</span>
                <button onClick={()=>setIsAddrOpen(false)} className="p-2 hover:text-red-500"><X size={20}/></button>
              </div>
              <div id="addr-layer" className="w-full h-[500px]"></div>
            </div>
          </div>
        )}

        <div className={`bg-white w-full ${authMode === 'signup' || authMode === 'setup' ? 'max-w-2xl' : 'max-w-md'} p-10 rounded-[3rem] shadow-2xl relative overflow-hidden transition-all duration-500 my-10`}>
          <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-indigo-400 mb-4 shadow-xl"><ShieldCheck size={32}/></div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight italic underline decoration-indigo-500 decoration-4 underline-offset-4">E-UM NEXUS</h1>
          </div>
          
          {authMode === 'login' && (
            <div className="space-y-6 animate-in fade-in">
              <button 
                onClick={handleGoogleLogin} 
                className="w-full py-4 bg-white border-2 border-slate-100 text-slate-700 rounded-2xl font-black text-sm shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                Google 계정으로 로그인
              </button>
              <div className="text-center">
                <button type="button" onClick={handleGoogleLogin} className="text-indigo-600 text-xs font-black hover:underline">신규 회원가입</button>
              </div>
            </div>
          )}

          {authMode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-5 animate-in slide-in-from-bottom-4">
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="성명" value={signUpData.name} onChange={e=>setSignUpData({...signUpData, name: e.target.value})} required className="w-full px-5 py-3.5 bg-slate-50 border rounded-2xl text-sm font-bold outline-none" />
                <input type="text" placeholder="연락처" value={signUpData.phone} onChange={e=>setSignUpData({...signUpData, phone: formatPhone(e.target.value)})} required className="w-full px-5 py-3.5 bg-slate-50 border rounded-2xl text-sm font-bold outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="업체명" value={signUpData.company} onChange={e=>setSignUpData({...signUpData, company: e.target.value})} required className="w-full px-5 py-3.5 bg-slate-50 border rounded-2xl text-sm font-bold outline-none" />
                <input type="text" placeholder="직책" value={signUpData.position} onChange={e=>setSignUpData({...signUpData, position: e.target.value})} required className="w-full px-5 py-3.5 bg-slate-50 border rounded-2xl text-sm font-bold outline-none" />
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="사무소 주소" value={signUpData.address} readOnly required className="flex-1 px-5 py-3.5 bg-slate-50 border rounded-2xl text-sm font-bold outline-none" />
                <button type="button" onClick={() => handleOpenAddr(addr => setSignUpData({...signUpData, address: addr}))} className="px-6 bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-slate-700 transition-all flex items-center gap-2"><MapIcon size={14}/> 주소 검색</button>
              </div>
              <input type="text" placeholder="상세 주소" value={signUpData.detailAddress} onChange={e=>setSignUpData({...signUpData, detailAddress: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border rounded-2xl text-sm font-bold outline-none" />
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="자격번호" value={signUpData.licenseNo} onChange={e=>setSignUpData({...signUpData, licenseNo: e.target.value})} required className="w-full px-5 py-3.5 bg-slate-50 border rounded-2xl text-sm font-bold outline-none" />
                <input type="text" placeholder="자격종류 (예: 신체, 재물 등)" value={signUpData.licenseType} onChange={e=>setSignUpData({...signUpData, licenseType: e.target.value})} required className="w-full px-5 py-3.5 bg-slate-50 border rounded-2xl text-sm font-bold outline-none" />
              </div>
              
              <div className="border-t pt-5 space-y-4">
                <input type="email" placeholder="구글 계정 이메일" value={signUpData.email} readOnly required className="w-full px-5 py-3.5 border rounded-2xl text-sm font-bold outline-none bg-slate-100 text-slate-500" />
              </div>
              {errorMsg && <p className="text-red-500 text-xs font-black">{errorMsg}</p>}
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-sm shadow-xl hover:bg-indigo-700 transition-all">회원가입 완료</button>
              <button type="button" onClick={() => signOut(auth)} className="w-full text-slate-400 text-xs font-bold text-center underline mt-4">
                로그인 화면으로 돌아가기
              </button>
            </form>
          )}

          {authMode === 'setup' && (
            <form onSubmit={handleCompleteSetup} className="space-y-5 animate-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-4">
                <p className="text-sm font-bold text-slate-600">
                  환영합니다, <span className="text-indigo-600">{user?.displayName}</span>님!<br/>
                  원활한 서비스 이용을 위해 추가 정보를 입력해주세요.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="성명" value={setupData.name} onChange={e => setSetupData({...setupData, name: e.target.value})} required autoComplete="off" className="w-full px-5 py-3.5 bg-slate-50 border rounded-2xl text-sm font-bold outline-none" />
                <input type="tel" placeholder="연락처 (- 제외)" value={setupData.phone} onChange={e => setSetupData({...setupData, phone: e.target.value})} required className="w-full px-5 py-3.5 bg-slate-50 border rounded-2xl text-sm font-bold outline-none" />
                <input type="text" placeholder="업체명" value={setupData.company} onChange={e => setSetupData({...setupData, company: e.target.value})} required className="w-full px-5 py-3.5 bg-slate-50 border rounded-2xl text-sm font-bold outline-none" />
                <input type="text" placeholder="직책" value={setupData.position} onChange={e => setSetupData({...setupData, position: e.target.value})} required className="w-full px-5 py-3.5 bg-slate-50 border rounded-2xl text-sm font-bold outline-none" />
              </div>

              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="사무소 주소" 
                  value={setupData.address} 
                  readOnly 
                  onClick={() => handleOpenAddr(addr => setSetupData({...setupData, address: addr}))} 
                  className="flex-1 px-5 py-3.5 bg-slate-50 border rounded-2xl text-sm font-bold outline-none cursor-pointer" 
                />
                <button type="button" onClick={() => handleOpenAddr(addr => setSetupData({...setupData, address: addr}))} className="px-6 bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-slate-700 transition-all flex items-center gap-2">
                  <MapIcon size={14}/> 주소 검색
                </button>
              </div>

              <input type="text" placeholder="상세 주소" value={setupData.detailAddress} onChange={e => setSetupData({...setupData, detailAddress: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border rounded-2xl text-sm font-bold outline-none" />
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="자격번호" value={setupData.licenseNo} onChange={e => setSetupData({...setupData, licenseNo: e.target.value})} required className="w-full px-5 py-3.5 bg-slate-50 border rounded-2xl text-sm font-bold outline-none" />
                <input type="text" placeholder="자격종류 (예: 신체, 재물 등)" value={setupData.licenseType} onChange={e => setSetupData({...setupData, licenseType: e.target.value})} required className="w-full px-5 py-3.5 bg-slate-50 border rounded-2xl text-sm font-bold outline-none" />
              </div>
              
              {errorMsg && <p className="text-red-500 text-xs font-black px-2">{errorMsg}</p>}
              
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-sm shadow-xl hover:bg-indigo-700 transition-all active:scale-[0.98]">
                가입 완료 및 승인 요청
              </button>
              
              <button type="button" onClick={() => signOut(auth)} className="w-full text-slate-400 text-xs font-bold text-center underline">
                다른 계정으로 로그인
              </button>
            </form>
          )}

          {authMode === 'pending' && (
            <div className="space-y-8 animate-in zoom-in text-center py-10">
              <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Clock size={40} />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-black text-slate-800">승인 대기 중</h3>
                <p className="text-sm font-bold text-slate-500 leading-relaxed">관리자의 승인이 완료된 후<br/>시스템을 이용하실 수 있습니다.</p>
              </div>
              <button onClick={()=>signOut(auth)} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all">로그아웃</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- 메인 앱 화면 ---
  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 text-white flex flex-col shrink-0 print:hidden transition-all duration-500">
        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-3 mb-12"><div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg"><ShieldCheck size={24}/></div><div><span className="text-xl font-black block tracking-tighter italic">E-UM NEXUS</span><span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Master Edition</span></div></div>
          <nav className="space-y-3">
            <button onClick={()=>setView('dashboard')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-sm ${view==='dashboard'?'bg-indigo-600 shadow-xl text-white':'text-slate-400 hover:bg-slate-800'}`}><LayoutDashboard size={20}/> 대시보드</button>
            <button onClick={()=>setView('list')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-sm ${view==='list'?'bg-indigo-600 shadow-xl text-white':'text-slate-400 hover:bg-slate-800'}`}><FileText size={20}/> 사건 관리대장</button>
            <button onClick={()=>setView('consultation')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-sm ${view==='consultation'?'bg-indigo-600 shadow-xl text-white':'text-slate-400 hover:bg-slate-800'}`}><MessageSquare size={20}/> 고객 상담일지</button>
            <button onClick={handleNewReport} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-sm ${view==='report'?'bg-indigo-600 shadow-xl text-white':'text-slate-400 hover:bg-slate-800'}`}><FileEdit size={20}/> 손해사정서 작성</button>
            <button onClick={()=>setView('calculator')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-sm ${view==='calculator'?'bg-indigo-600 shadow-xl text-white':'text-slate-400 hover:bg-slate-800'}`}><Calculator size={20}/> 손해배상금 산출</button>
            <button onClick={()=>setView('community')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-sm ${view==='community'?'bg-indigo-600 shadow-xl text-white':'text-slate-400 hover:bg-slate-800'}`}><Users size={20}/> 실무지식교류방</button>
            
            {profile?.email === 'sopy1337@gmail.com' && (
              <button onClick={()=>setView('admin')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-sm ${view==='admin'?'bg-indigo-600 shadow-xl text-white':'text-slate-400 hover:bg-slate-800'}`}>
                <Shield size={20}/> 관리자 승인
              </button>
            )}

            <div className="pt-4 mt-4 border-t border-slate-800 space-y-1">
              <p className="px-5 text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Data Management</p>
              <button onClick={handleExportCSV} className="w-full flex items-center gap-4 px-5 py-3 rounded-xl text-slate-400 hover:bg-slate-800 transition-all font-bold text-xs"><FileSearch size={18}/> 엑셀(CSV) 내보내기</button>
              <button onClick={handleBackup} className="w-full flex items-center gap-4 px-5 py-3 rounded-xl text-slate-400 hover:bg-slate-800 transition-all font-bold text-xs"><Download size={18}/> 전체 백업(JSON)</button>
              <label className="w-full flex items-center gap-4 px-5 py-3 rounded-xl text-slate-400 hover:bg-slate-800 transition-all font-bold text-xs cursor-pointer">
                <CloudUpload size={18}/> 데이터 복구(Restore)
                <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
              </label>
            </div>
          </nav>
        </div>
        <div className="mt-auto p-8 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center font-black text-xs text-indigo-400 border border-slate-700">{profile?.name?.[0] || 'U'}</div>
            <div className="overflow-hidden"><p className="text-xs font-black truncate text-slate-200">{profile?.name || user?.email}</p><p className="text-[9px] text-emerald-500 font-black tracking-widest uppercase">{profile?.company || '정회원'}</p></div>
          </div>
          <button onClick={()=>signOut(auth)} className="w-full py-3.5 bg-slate-800/50 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:text-white transition-all flex items-center justify-center gap-2"><LogOut size={14}/> 로그아웃</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 bg-white border-b px-10 flex items-center justify-between shrink-0 z-10 print:hidden shadow-sm">
          <div className="flex items-center gap-6">
            {view === 'report' && <button onClick={()=>setView('list')} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><ChevronLeft size={24}/></button>}
            <h2 className="text-2xl font-black text-slate-800 tracking-tight italic uppercase underline decoration-indigo-500 decoration-4 underline-offset-8 tracking-tighter">
              {view === 'report' ? '손해사정서 작성' : view === 'list' ? '사건 통합 대장' : view === 'consultation' ? '고객 상담일지' : view === 'community' ? '실무지식교류방' : view === 'admin' ? '신규 가입자 승인' : view === 'calculator' ? '손해배상금 산출' : '현황판'}
            </h2>
          </div>
          <div className="flex gap-4">
            {(view === 'report' || view === 'calculator') ? (
              <>
                {view === 'report' && <div className="flex bg-slate-100 p-1 rounded-lg mr-4 print:hidden">
                  <button onClick={() => setReportTab('input')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${reportTab === 'input' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>데이터 입력</button>
                  <button onClick={() => setReportTab('preview')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${reportTab === 'preview' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>리포트 미리보기</button>
                </div>}
                {selectedCaseForReport?.id && view === 'report' && <button onClick={handleSaveReportData} disabled={isSavingReport} className={`bg-indigo-600 text-white px-8 py-3 rounded-2xl text-sm font-black flex items-center gap-2 shadow-xl hover:scale-105 transition-all ${isSavingReport ? 'opacity-50' : ''}`}>
                  {isSavingReport ? <Loader2 size={18} className="animate-spin" /> : <CloudUpload size={18}/>} 손해사정서 저장
                </button>}
                <button onClick={()=>window.print()} className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-sm font-black flex items-center gap-2 shadow-xl hover:scale-105 transition-all"><Printer size={18}/> PDF / 인쇄</button>
              </>
            ) : (
              <button onClick={()=>{setEditingCase({logs:[], diagnoses: [], attachments: [], status: '접수', payoutAmount: 0, disabilityRate: 0, amount: 0, insurances: [{insuranceType: '자동차보험', coverageDetails: []}], coverageDetails: [], receptionDate: new Date().toISOString().split('T')[0]}); setIsModalOpen(true);}} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-sm font-black flex items-center gap-2 shadow-xl hover:scale-105 transition-all"><Plus size={20}/> 사건 신규 등록</button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50 custom-scrollbar print:p-0">
          {/* DASHBOARD */}
          {view === 'dashboard' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="grid grid-cols-4 gap-8">
                {[
                  { label: '전체 사건', val: stats.total, color: 'indigo', icon: FileText, filter: '전체' },
                  { label: '미결 건수', val: stats.pending, color: 'amber', icon: Clock, filter: '미결' },
                  { label: '당월 접수', val: stats.intake, color: 'blue', icon: Plus, filter: '당월접수' },
                  { label: '종결 완료', val: stats.closed, color: 'emerald', icon: CheckCircle2, filter: '종결' }
                ].map((s, i) => {
                   const IconComp = s.icon; 
                   return (
                    <div 
                      key={i} 
                      onClick={() => { setView('list'); setStatusFilter(s.filter); }}
                      className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl group cursor-pointer"
                    >
                      <div className={`p-4 bg-${s.color}-50 text-${s.color}-600 rounded-2xl w-fit mb-6 group-hover:scale-110 transition-transform`}><IconComp size={24}/></div>
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{s.label}</p>
                      <h3 className="text-4xl font-black text-slate-800 tracking-tighter">{s.val}<span className="text-sm ml-1 text-slate-300 font-bold">건</span></h3>
                    </div>
                  );
                })}
              </div>

              {/* 업무 및 일정 섹션 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 구글 캘린더 연동 */}
                <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Calendar size={20}/></div>
                      <h4 className="text-lg font-black text-slate-800 tracking-tight">구글 캘린더</h4>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsQuickModalOpen(true)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition-all text-xs font-black shadow-md"
                      >
                        <Plus size={16}/>
                        <span>일정 추가</span>
                      </button>
                      <button
                        onClick={handleConnectGoogle}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl transition-all text-xs font-black ${googleToken ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                        title="API 연동"
                      >
                        {googleToken ? <CheckCircle2 size={16}/> : <Plus size={16}/>}
                        <span>{googleToken ? 'API 연동됨' : '구글 API 연동'}</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 min-h-[400px] rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                    <iframe 
                      key={`${user?.email || 'default'}-${calendarRefreshKey}`}
                      src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(user?.email || 'sopy1337@gmail.com')}&ctz=Asia%2FSeoul&mode=MONTH&wkst=1&bgcolor=%23ffffff&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0&showTz=0`} 
                      style={{ border: 0 }} 
                      width="100%" 
                      height="100%" 
                      frameBorder="0" 
                      scrolling="no"
                      title="Google Calendar"
                    ></iframe>
                  </div>
                </div>

                {/* 할 일 목록 (Memo) */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><CheckCircle2 size={20}/></div>
                      <h4 className="text-lg font-black text-slate-800 tracking-tight">오늘 할 일</h4>
                    </div>
                    <input 
                      type="date" 
                      value={selectedTodoDate} 
                      onChange={e => setSelectedTodoDate(e.target.value)}
                      className="bg-slate-50 border-none text-xs font-black text-indigo-600 outline-none px-4 py-2 rounded-xl"
                    />
                  </div>
                  
                  <div className="flex gap-2 mb-6">
                    <input 
                      type="text" 
                      placeholder="오늘 할 일을 입력하세요..." 
                      className="flex-1 bg-slate-50 border border-slate-100 px-5 py-3 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      value={todoInput}
                      onChange={e => setTodoInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddTodo()}
                    />
                    <button onClick={handleAddTodo} className="px-6 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-700 transition-all">추가</button>
                  </div>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {filteredTodos.length > 0 ? filteredTodos.map(todo => (
                      <div key={todo.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-50 group hover:bg-white hover:shadow-md transition-all">
                        <div className="flex items-center gap-3">
                          <button onClick={() => handleToggleTodo(todo)} className={`p-1 rounded-md transition-colors ${todo.completed ? 'text-emerald-500 bg-emerald-50' : 'text-slate-300 bg-white border'}`}>
                            <CheckCircle2 size={16}/>
                          </button>
                          <span className={`text-sm font-bold ${todo.completed ? 'text-slate-300 line-through' : 'text-slate-700'}`}>{todo.text}</span>
                        </div>
                        <button onClick={() => handleDeleteTodo(todo.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                      </div>
                    )) : (
                      <div className="py-10 text-center text-slate-300 text-xs font-bold uppercase tracking-widest">기록된 할 일이 없습니다.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 rounded-[3rem] p-16 text-white flex justify-between items-center shadow-2xl relative overflow-hidden group">
                <div className="relative z-10">
                  <h4 className="text-indigo-400 text-xs font-black uppercase mb-6 tracking-[0.3em] animate-pulse italic">지급 예상 수수료</h4>
                  <p className="text-6xl font-black leading-none tracking-tighter italic">예상 수수료 합계<br/><span className="text-indigo-400 font-mono mt-4 block not-italic">₩{(stats.totalAmount).toLocaleString()}</span></p>
                </div>
                <div className="relative z-10 text-right space-y-4">
                  <div className="p-6 bg-white/5 rounded-[2rem] backdrop-blur-md border border-white/10 text-left">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Expert License</p>
                    <p className="text-xl font-black italic text-indigo-300">NO. {profile?.licenseNo || '기록 없음'}</p>
                  </div>
                  <button onClick={()=>setView('list')} className="px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl transition-all hover:scale-105">전체 사건 조회</button>
                </div>
              </div>
            </div>
          )}

          {/* ADMIN VIEW: 가입 승인 관리 */}
          {view === 'admin' && (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
              <div className="p-8 bg-slate-50/30 border-b flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-800">승인 대기 중인 사용자 ({pendingUsers.length})</h3>
                <button onClick={fetchPendingUsers} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black hover:bg-indigo-100 transition-all">새로고침</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] text-slate-400 font-black uppercase tracking-widest border-b">
                    <tr>
                      <th className="px-10 py-6">성명 / 이메일</th>
                      <th className="px-8 py-6">업체 / 직책</th>
                      <th className="px-6 py-6">연락처 / 자격번호</th>
                      <th className="px-10 py-6 text-right">작업</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {pendingUsers.length > 0 ? pendingUsers.map(u => (
                      <tr key={u.uid} className="hover:bg-indigo-50/10 transition-all">
                        <td className="px-10 py-8">
                          <p className="font-black text-sm text-slate-800">{u.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{u.email}</p>
                        </td>
                        <td className="px-8 py-8">
                          <p className="text-sm font-bold text-slate-700">{u.company}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{u.position}</p>
                        </td>
                        <td className="px-6 py-8">
                          <p className="text-sm font-bold text-slate-700">{u.phone}</p>
                          <p className="text-[10px] text-slate-400 font-bold">No. {u.licenseNo}</p>
                        </td>
                        <td className="px-10 py-8 text-right">
                          <button onClick={() => handleApproveUser(u.uid)} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg hover:bg-indigo-700 transition-all">승인하기</button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="4" className="px-10 py-20 text-center text-slate-300 font-bold uppercase tracking-widest">승인 대기 중인 사용자가 없습니다.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* COMMUNITY VIEW */}
          {view === 'community' && (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Users size={28}/></div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">실무지식교류방</h3>
                  <p className="text-sm font-bold text-slate-400">손해사정 실무 지식과 노하우를 공유하는 공간입니다.</p>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/30">
                <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center text-slate-200 mb-6"><Users size={40}/></div>
                <p className="text-slate-400 font-black text-lg tracking-tight">지식 교류를 위한 커뮤니티 기능을 준비 중입니다.</p>
                <p className="text-slate-300 text-sm font-bold mt-2">곧 새로운 소통의 장으로 찾아뵙겠습니다.</p>
              </div>
            </div>
          )}

          {/* CONSULTATION LOG VIEW */}
          {view === 'consultation' && (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
              <div className="p-8 bg-slate-50/30 border-b flex justify-between items-center">
                <div className="relative w-[450px]">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input 
                    type="text" 
                    placeholder="고객명, 연락처, 상담내용 검색..." 
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                    value={consultationSearch} 
                    onChange={e=>setConsultationSearch(e.target.value)}
                  />
                </div>
                <button 
                  onClick={()=>{
                    setEditingConsultation({
                      date: new Date().toISOString().split('T')[0],
                      clientName: '',
                      phone: '',
                      content: '',
                      status: '상담중'
                    });
                    setIsConsultationModalOpen(true);
                  }} 
                  className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-black flex items-center gap-2 shadow-xl hover:scale-105 transition-all"
                >
                  <Plus size={20}/> 신규 상담 등록
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] text-slate-400 font-black uppercase tracking-widest border-b">
                    <tr>
                      <th className="px-10 py-6">상담일자</th>
                      <th className="px-8 py-6">고객명 / 연락처</th>
                      <th className="px-8 py-6">상담 내용</th>
                      <th className="px-6 py-6 text-center">상태</th>
                      <th className="px-10 py-6 text-right">작업</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {consultations
                      .filter(c => `${c.clientName} ${c.phone} ${c.content}`.toLowerCase().includes(consultationSearch.toLowerCase()))
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map(c => (
                        <tr key={c.id} className="hover:bg-indigo-50/10 group transition-all">
                          <td className="px-10 py-8 font-bold text-sm text-slate-600">{c.date}</td>
                          <td className="px-8 py-8">
                            <p className="font-black text-sm text-slate-800">{c.clientName}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{c.phone}</p>
                          </td>
                          <td className="px-8 py-8">
                            <p className="text-sm text-slate-600 line-clamp-2 max-w-md">{c.content}</p>
                          </td>
                          <td className="px-6 py-8 text-center">
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border ${c.status === '상담완료' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : c.status === '사건전환' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{c.status}</span>
                          </td>
                          <td className="px-10 py-8 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={() => { setEditingConsultation(c); setIsConsultationModalOpen(true); }} className="p-2 hover:text-indigo-600"><Edit2 size={16}/></button>
                              <button onClick={() => handleDeleteConsultation(c.id)} className="p-2 hover:text-red-600"><Trash2 size={16}/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* LIST */}
          {view === 'list' && (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
              <div className="p-8 bg-slate-50/30 border-b flex justify-between items-center">
                <div className="relative w-[450px]"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" placeholder="의뢰인, 진단명, 보험사 검색..." className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div>
                <div className="flex gap-4">{['전체', '당월접수', '미결', '종결', '사정서작성'].map(s => <button key={s} onClick={()=>setStatusFilter(s)} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${statusFilter===s?'bg-slate-900 text-white shadow-lg':'bg-white border text-slate-400 hover:bg-slate-50'}`}>{s}</button>)}</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] text-slate-400 font-black uppercase tracking-widest border-b">
                    <tr>
                      <th className="px-10 py-6">의뢰인 / 계약자</th>
                      <th className="px-8 py-6">진단명(들) / 보험사</th>
                      <th className="px-6 py-6 text-center">상태</th>
                      <th className="px-6 py-6 text-indigo-600 font-black italic text-center">예상 수수료</th>
                      <th className="px-10 py-6 text-right">업무도구</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredCases.map(c => {
                      const dateToUse = c.receptionDate || c.createdAt;
                      const isNew = dateToUse && new Date(dateToUse).getMonth() === new Date().getMonth() && new Date(dateToUse).getFullYear() === new Date().getFullYear();
                      return (
                        <tr key={c.id} className="hover:bg-indigo-50/10 group transition-all">
                          <td className="px-10 py-8 font-black text-sm text-slate-800">
                            <div className="flex items-center gap-2 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleOpenEditModal(c)}>
                              {c.clientName}
                              {isNew && <span className="px-2 py-0.5 bg-rose-500 text-white text-[8px] rounded-md animate-pulse">당월</span>}
                              {c.reportData && <span className="px-2 py-0.5 bg-indigo-500 text-white text-[8px] rounded-md">사정서</span>}
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold mt-1">계약자: {c.contractor || '-'}</p>
                          </td>
                          <td className="px-8 py-8"><div className="flex flex-wrap gap-1 mb-1">{(c.diagnoses || []).map((d, i)=><span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-lg">{d}</span>)}</div><p className="text-[10px] text-slate-400 font-bold uppercase">{c.insuranceCompany || '-'} ({c.claimNumber || '-'})</p></td>
                          <td className="px-6 py-8 text-center"><span className={`px-4 py-1.5 rounded-full text-[10px] font-black border ${c.status==='종결'?'bg-emerald-50 text-emerald-600 border-emerald-100':'bg-amber-50 text-amber-600 border-amber-100'}`}>{c.status === '종결' ? '종결' : '미결'}</span></td>
                          <td className="px-6 py-8 font-mono text-sm font-black text-slate-700 text-center">₩{formatComma(c.amount || 0)}</td>
                          <td className="px-10 py-8 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                              <button onClick={()=>startReport(c)} title="손해사정서 작성" className="p-3 bg-white border border-slate-200 rounded-xl hover:text-indigo-600 shadow-sm transition-all"><FileEdit size={16}/></button>
                              <button onClick={() => handleOpenEditModal(c)} title="수정" className="p-3 bg-white border border-slate-200 rounded-xl hover:text-indigo-600 shadow-sm transition-all"><Edit2 size={16}/></button>
                              <button onClick={()=>handleDelete(c.id)} title="삭제" className="p-3 bg-white border border-slate-200 rounded-xl hover:text-red-600 shadow-sm transition-all"><Trash2 size={16}/></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT */}
          {view === 'report' && selectedCaseForReport && (
            <div className="animate-in slide-in-from-right-8 duration-500">
              {reportTab === 'input' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-12 space-y-8">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row items-center gap-6">
                      <div className="flex-1 w-full space-y-1">
                        <label className="text-xs font-bold text-slate-500 ml-1">의뢰인 불러오기</label>
                        <div className="flex gap-2">
                          <select 
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none"
                            value={selectedReportCaseId}
                            onChange={(e) => setSelectedReportCaseId(e.target.value)}
                          >
                            <option value="">의뢰인 선택...</option>
                            {cases.map(c => (
                              <option key={c.id} value={c.id}>{c.clientName} {c.reportData ? '✓' : ''} ({c.insuranceCompany || '보험사 미정'})</option>
                            ))}
                          </select>
                          <button onClick={handleLoadReportCase} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-black transition-all flex items-center gap-2">
                            <History size={14}/> 불러오기
                          </button>
                        </div>
                      </div>
                      <div className="w-px h-10 bg-slate-200 hidden md:block"></div>
                      <div className="w-full md:w-auto space-y-1">
                        <label className="text-xs font-bold text-slate-500 ml-1">손해사정서 종류</label>
                        <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none" value={reportData.reportType || 'liability'} onChange={e => updateReportField('reportType', e.target.value)}>
                          <option value="liability">배상책임 손해사정서</option>
                          <option value="auto">자동차보험 손해사정서</option>
                          <option value="longTermDisease">장기보험 손해사정서(질병)</option>
                          <option value="longTermInjury">장기보험 손해사정서(상해)</option>
                          <option value="medical">실손보험 손해사정서</option>
                        </select>
                      </div>
                    </div>
                    <FormSection title="손해사정사(업체) 정보" icon={PenTool}>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <InputGroup label="손해사정업체명"><input type="text" value={reportData.company.name} onChange={e => updateReportField('company.name', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                        <InputGroup label="대표 손해사정사"><input type="text" value={reportData.company.repName} onChange={e => updateReportField('company.repName', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                      </div>
                      <div className="mb-4">
                        <InputGroup label="담당 조사자"><input type="text" value={reportData.company.investigator} onChange={e => updateReportField('company.investigator', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                      </div>
                      <div className="mb-4">
                        <InputGroup label="주소"><div className="flex gap-2"><input type="text" value={reportData.company.address} onChange={e => updateReportField('company.address', e.target.value)} className="flex-1 border p-2 rounded-md" /><button onClick={() => handleOpenAddr(addr => updateReportField('company.address', addr))} className="px-3 bg-slate-200 rounded-md text-xs font-bold hover:bg-slate-300">검색</button></div></InputGroup>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <InputGroup label="등록번호"><input type="text" value={reportData.company.regNo} onChange={e => updateReportField('company.regNo', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                        <InputGroup label="연락처"><input type="text" value={reportData.company.repPhone} onChange={e => updateReportField('company.repPhone', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 ml-1">직인/도장 이미지</label>
                        <div className="flex items-center gap-4">
                            {(reportData.company.stampUrl || profile?.stampUrl) && <img key={reportData.company.stampUrl || profile?.stampUrl} src={reportData.company.stampUrl || profile?.stampUrl} alt="Stamp" className="w-12 h-12 object-contain border rounded-lg p-1" />}
                            <input type="file" accept="image/*" onChange={handleStampUpload} className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                        </div>
                      </div>
                    </FormSection>

                    <FormSection title="수임 및 위임자 정보" icon={User}>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <InputGroup label="수임일자"><input type="date" value={reportData.engagement.assignedDate} onChange={e => updateReportField('engagement.assignedDate', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                        <InputGroup label="위임 내용"><input type="text" value={reportData.engagement.content} onChange={e => updateReportField('engagement.content', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                      </div>
                      <h5 className="text-[13pt] font-bold text-slate-700 mb-2 border-b pb-1">위임자 인적사항</h5>
                      <div className="grid grid-cols-3 gap-4">
                        <InputGroup label="성명"><input type="text" value={reportData.engagement.mandator.name} onChange={e => updateReportField('engagement.mandator.name', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                        <InputGroup label="생년월일"><input type="date" value={reportData.engagement.mandator.birthDate} onChange={e => updateReportField('engagement.mandator.birthDate', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                        <InputGroup label="주민등록번호"><input type="text" value={reportData.engagement.mandator.residentNo} onChange={e => updateReportField('engagement.mandator.residentNo', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                        <InputGroup label="연락처"><input type="text" value={reportData.engagement.mandator.phone} onChange={e => updateReportField('engagement.mandator.phone', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                        <InputGroup label="직업"><input type="text" value={reportData.engagement.mandator.job} onChange={e => updateReportField('engagement.mandator.job', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                        <InputGroup label="관계"><input type="text" value={reportData.engagement.mandator.relation} onChange={e => updateReportField('engagement.mandator.relation', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                        <div className="col-span-3"><InputGroup label="주소"><div className="flex gap-2"><input type="text" value={reportData.engagement.mandator.address} onChange={e => updateReportField('engagement.mandator.address', e.target.value)} className="flex-1 border p-2 rounded-md" /><button onClick={() => handleOpenAddr(addr => updateReportField('engagement.mandator.address', addr))} className="px-3 bg-slate-200 rounded-md text-xs font-bold hover:bg-slate-300">검색</button></div></InputGroup></div>
                      </div>
                      <h5 className="text-[13pt] font-bold text-slate-700 mt-6 mb-2 border-b pb-1">피보험자(피해자) 인적사항</h5>
                      <div className="grid grid-cols-3 gap-4">
                        <InputGroup label="성명"><input type="text" value={reportData.engagement.victim.name} onChange={e => updateReportField('engagement.victim.name', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                        <InputGroup label="생년월일"><input type="date" value={reportData.engagement.victim.birthDate} onChange={e => updateReportField('engagement.victim.birthDate', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                        <InputGroup label="주민등록번호"><input type="text" value={reportData.engagement.victim.residentNo} onChange={e => updateReportField('engagement.victim.residentNo', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                        <InputGroup label="연락처"><input type="text" value={reportData.engagement.victim.phone} onChange={e => updateReportField('engagement.victim.phone', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                        <InputGroup label="직업"><input type="text" value={reportData.engagement.victim.job} onChange={e => updateReportField('engagement.victim.job', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                        <InputGroup label="관계"><input type="text" value={reportData.engagement.victim.relation} onChange={e => updateReportField('engagement.victim.relation', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                        <div className="col-span-3"><InputGroup label="주소"><div className="flex gap-2"><input type="text" value={reportData.engagement.victim.address} onChange={e => updateReportField('engagement.victim.address', e.target.value)} className="flex-1 border p-2 rounded-md" /><button onClick={() => handleOpenAddr(addr => updateReportField('engagement.victim.address', addr))} className="px-3 bg-slate-200 rounded-md text-xs font-bold hover:bg-slate-300">검색</button></div></InputGroup></div>
                      </div>
                    </FormSection>

                    <FormSection title={reportData.reportType === 'longTermDisease' ? "보험계약 및 보험사고사항" : "보험계약 및 사고사항"} icon={Shield}>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <InputGroup label="보험사"><input type="text" value={reportData.policy.insurer} onChange={e => updateReportField('policy.insurer', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                        <InputGroup label="보험종목"><input type="text" value={reportData.policy.item} onChange={e => updateReportField('policy.item', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                        <InputGroup label="보험상품명"><input type="text" value={reportData.policy.productName} onChange={e => updateReportField('policy.productName', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                        <InputGroup label="증권번호"><input type="text" value={reportData.policy.policyNo} onChange={e => updateReportField('policy.policyNo', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                        <InputGroup label="피보험자"><input type="text" value={reportData.policy.insured} onChange={e => updateReportField('policy.insured', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                        <InputGroup label="계약자"><input type="text" value={reportData.policy.contractor} onChange={e => updateReportField('policy.contractor', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                        <InputGroup label="연락처"><input type="text" value={reportData.policy.phone} onChange={e => updateReportField('policy.phone', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                        <div className="col-span-3"><InputGroup label="주소"><div className="flex gap-2"><input type="text" value={reportData.policy.address} onChange={e => updateReportField('policy.address', e.target.value)} className="flex-1 border p-2 rounded-md" /><button onClick={() => handleOpenAddr(addr => updateReportField('policy.address', addr))} className="px-3 bg-slate-200 rounded-md text-xs font-bold hover:bg-slate-300">검색</button></div></InputGroup></div>
                        <div className="col-span-2">
                          <InputGroup label="보험기간">
                            <div className="flex items-center gap-2">
                              <input type="date" className="w-full border p-2 rounded-md" value={reportData.policy.period?.split(' ~ ')[0] || ''} onChange={e => {
                                const end = reportData.policy.period?.split(' ~ ')[1] || '';
                                updateReportField('policy.period', `${e.target.value} ~ ${end}`);
                              }} />
                              <span className="font-bold text-slate-400">~</span>
                              <input type="date" className="w-full border p-2 rounded-md" value={reportData.policy.period?.split(' ~ ')[1] || ''} onChange={e => {
                                const start = reportData.policy.period?.split(' ~ ')[0] || '';
                                updateReportField('policy.period', `${start} ~ ${e.target.value}`);
                              }} />
                            </div>
                          </InputGroup>
                        </div>
                        <InputGroup label="보상한도/자기부담금"><input type="text" value={reportData.policy.limitDeductible} onChange={e => updateReportField('policy.limitDeductible', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                        <div className="col-span-3"><InputGroup label="담보내용"><input type="text" value={reportData.policy.coverageDetails} onChange={e => updateReportField('policy.coverageDetails', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup></div>
                        <div className="col-span-3"><InputGroup label="기타사항"><input type="text" value={reportData.policy.otherDetails} onChange={e => updateReportField('policy.otherDetails', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup></div>
                      </div>
                      <hr className="my-4" />
                      <div className="space-y-4">
                        {reportData.reportType !== 'longTermDisease' && (
                          <InputGroup label="사고개요"><input type="text" value={reportData.accident.overview} onChange={e => updateReportField('accident.overview', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <InputGroup label={reportData.reportType === 'longTermDisease' ? "진단일" : "사고일시"}>
                            <input type={reportData.reportType === 'longTermDisease' ? "date" : "datetime-local"} value={reportData.accident.time} onChange={e => updateReportField('accident.time', e.target.value)} className="w-full border p-2 rounded-md" />
                          </InputGroup>
                          <InputGroup label={reportData.reportType === 'longTermDisease' ? "치료병원" : "사고장소"}>
                            <input type="text" value={reportData.accident.place} onChange={e => updateReportField('accident.place', e.target.value)} className="w-full border p-2 rounded-md" />
                          </InputGroup>
                        </div>
                        <InputGroup label="사고원인"><input type="text" value={reportData.accident.cause} onChange={e => updateReportField('accident.cause', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                        <InputGroup label={reportData.reportType === 'longTermDisease' ? "치료내용" : "사고내용"}>
                          <RichTextEditor value={reportData.accident.details} onChange={val => updateReportField('accident.details', val)} />
                        </InputGroup>
                        {reportData.reportType !== 'longTermDisease' && (
                          <InputGroup label="사고발생관련사항(조사내용)"><RichTextEditor value={reportData.accident.investigationDetails} onChange={val => updateReportField('accident.investigationDetails', val)} /></InputGroup>
                        )}
                      </div>
                    </FormSection>

                    {reportData.reportType !== 'longTermDisease' && (
                      <FormSection title="손해내용" icon={Landmark}>
                        <div className="grid grid-cols-2 gap-4">
                          <InputGroup label="병원명"><input type="text" value={reportData.damage.hospital} onChange={e => updateReportField('damage.hospital', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                          <InputGroup label="상병명"><input type="text" value={reportData.damage.diagnosis} onChange={e => updateReportField('damage.diagnosis', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                          <div className="col-span-2"><InputGroup label="치료내용"><RichTextEditor value={reportData.damage.treatment} onChange={val => updateReportField('damage.treatment', val)} /></InputGroup></div>
                        </div>
                      </FormSection>
                    )}

                    {!reportData.reportType?.startsWith('longTerm') && (
                      <FormSection title="손해액 산정" icon={Calculator}>
                        <div className="grid grid-cols-2 gap-6">
                          {Object.entries(assessmentLabels).map(([key, label]) => (
                            <div key={key} className="space-y-1">
                              <div className="flex justify-between items-center px-1">
                                <label className="text-xs font-bold text-slate-500">{label}</label>
                                <button onClick={() => setActiveCalcField(key)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-[10px] font-bold">
                                  <Calculator size={12}/> 상세계산
                                </button>
                              </div>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₩</span>
                                <input 
                                  type="text" 
                                  className="w-full pl-8 pr-3 py-2 border rounded-md text-sm font-bold text-right outline-none focus:ring-2 focus:ring-blue-500"
                                  value={formatComma(reportData.assessment[key])}
                                  onChange={e => updateReportField(`assessment.${key}`, unformatComma(e.target.value))}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                          <div className="flex justify-between items-center font-bold text-slate-600 text-sm"><span>손해액 합계</span><span>₩{calcs.subTotal.toLocaleString()}</span></div>
                          <div className="flex justify-between items-center font-bold text-rose-500 text-sm"><span>과실상계 ({reportData.liability.faultPercent}%)</span><span>- ₩{calcs.faultOffset.toLocaleString()}</span></div>
                          <div className="flex justify-between items-center font-black text-indigo-600 pt-3 border-t border-slate-200 text-lg"><span>최종 사정금액</span><span>₩{calcs.finalPayment.toLocaleString()}</span></div>
                        </div>
                      </FormSection>
                    )}

                    <FormSection title={reportData.reportType?.startsWith('longTerm') || reportData.reportType === 'medical' ? "보험사의 보험금 지급책임 검토" : "손해배상책임 등 검토"} icon={Shield}>
                      <div className="space-y-4">
                        <InputGroup label={reportData.reportType?.startsWith('longTerm') || reportData.reportType === 'medical' ? "보험사의 보험금 지급책임 면/부책" : "피보험자 손해배상책임 면/부책"}><input type="text" value={reportData.liability.liabilityStatus} onChange={e => updateReportField('liability.liabilityStatus', e.target.value)} className="w-full border p-2 rounded-md" /></InputGroup>
                        <div className="space-y-2">
                          <h5 className="text-[13pt] font-bold text-slate-700 mb-2 border-b pb-1">약관상 보험자 지급책임 근거</h5>
                          <div className="grid grid-cols-1 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <input type="text" placeholder="제목 (예: 보상하는 손해)" className="w-full border p-2 rounded-md text-sm" value={newPolicyBasis.title} onChange={e => setNewPolicyBasis({...newPolicyBasis, title: e.target.value})} />
                            <textarea rows={2} className="w-full border p-2 rounded-md text-sm" placeholder="내용 입력..." value={newPolicyBasis.content} onChange={e => setNewPolicyBasis({...newPolicyBasis, content: e.target.value})} />
                            <button type="button" onClick={() => {
                              if (newPolicyBasis.title.trim() && newPolicyBasis.content.trim()) {
                                updateReportField('liability.policyLiabilityBasis', [...(reportData.liability.policyLiabilityBasis || []), { ...newPolicyBasis }]);
                                setNewPolicyBasis({ title: '', content: '' });
                              }
                            }} className="w-full py-2 bg-slate-800 text-white rounded-md text-xs font-bold hover:bg-black">추가</button>
                          </div>
                          <div className="space-y-1 mt-2">
                            {(reportData.liability.policyLiabilityBasis || []).map((item, idx) => (
                              <div key={idx} className="p-3 bg-white rounded-xl border border-slate-100 relative group">
                                <button type="button" onClick={() => updateReportField('liability.policyLiabilityBasis', reportData.liability.policyLiabilityBasis.filter((_, i) => i !== idx))} className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                                <p className="text-xs font-black text-blue-600 mb-1">{item.title}</p>
                                <p className="text-sm text-slate-600 whitespace-pre-wrap">{item.content}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h5 className="text-[13pt] font-bold text-slate-700 mb-2 border-b pb-1">법률상 지급책임</h5>
                          <div className="grid grid-cols-1 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <input type="text" placeholder="제목 (예: 민법 제750조)" className="w-full border p-2 rounded-md text-sm" value={newLegalBasis.title} onChange={e => setNewLegalBasis({...newLegalBasis, title: e.target.value})} />
                            <textarea rows={2} className="w-full border p-2 rounded-md text-sm" placeholder="내용 입력..." value={newLegalBasis.content} onChange={e => setNewLegalBasis({...newLegalBasis, content: e.target.value})} />
                            <button type="button" onClick={() => {
                              if (newLegalBasis.title.trim() && newLegalBasis.content.trim()) {
                                updateReportField('liability.legalLiabilityBasis', [...(reportData.liability.legalLiabilityBasis || []), { ...newLegalBasis }]);
                                setNewLegalBasis({ title: '', content: '' });
                              }
                            }} className="w-full py-2 bg-slate-800 text-white rounded-md text-xs font-bold hover:bg-black">추가</button>
                          </div>
                          <div className="space-y-1 mt-2">
                            {(reportData.liability.legalLiabilityBasis || []).map((item, idx) => (
                              <div key={idx} className="p-3 bg-white rounded-xl border border-slate-100 relative group">
                                <button type="button" onClick={() => updateReportField('liability.legalLiabilityBasis', reportData.liability.legalLiabilityBasis.filter((_, i) => i !== idx))} className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                                <p className="text-xs font-black text-blue-600 mb-1">{item.title}</p>
                                <p className="text-sm text-slate-600 whitespace-pre-wrap">{item.content}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        {(reportData.reportType === 'liability' || reportData.reportType === 'auto') && <InputGroup label="피해자의 과실상계"><input type="text" value={reportData.liability.faultPercent} onChange={e => updateReportField('liability.faultPercent', e.target.value)} className="w-full border p-2 rounded-md" placeholder="%" /></InputGroup>}
                        <div className="space-y-2">
                          <h5 className="text-[13pt] font-bold text-slate-700 mb-2 border-b pb-1">보험사의 보험금 지급책임</h5>
                          
                          {/* 문구 라이브러리 선택 */}
                          <div className="flex gap-2 mb-2">
                            <select 
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none"
                              onChange={(e) => {
                                const template = liabilityLibrary[e.target.value];
                                if (template) setNewPayLiab(template);
                              }}
                              value=""
                            >
                              <option value="">자주 쓰는 문구 라이브러리 선택...</option>
                              {liabilityLibrary.map((t, idx) => (
                                <option key={idx} value={idx}>{t.title}</option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-1 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <input type="text" placeholder="제목 (예: 지급책임의 발생)" className="w-full border p-2 rounded-md text-sm" value={newPayLiab.title} onChange={e => setNewPayLiab({...newPayLiab, title: e.target.value})} />
                            <textarea rows={3} placeholder="내용 입력..." className="w-full border p-2 rounded-md text-sm" value={newPayLiab.content} onChange={e => setNewPayLiab({...newPayLiab, content: e.target.value})} />
                            <div className="flex gap-2">
                              <button type="button" onClick={() => {
                                if (newPayLiab.title.trim() && newPayLiab.content.trim()) {
                                  updateReportField('liability.paymentLiability', [...(reportData.liability.paymentLiability || []), { ...newPayLiab }]);
                                  setNewPayLiab({ title: '', content: '' });
                                }
                              }} className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-md text-xs font-bold hover:bg-black">항목 추가</button>
                              <button type="button" onClick={() => {
                                if (newPayLiab.title.trim() && newPayLiab.content.trim()) {
                                  setLiabilityLibrary(prev => [...prev, { ...newPayLiab }]);
                                  alert("현재 문구가 라이브러리에 저장되었습니다.");
                                }
                              }} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-md text-xs font-bold hover:bg-indigo-100">라이브러리 저장</button>
                              <button type="button" onClick={() => setNewPayLiab({ title: '', content: '' })} className="px-4 py-2 bg-slate-100 text-slate-500 rounded-md text-xs font-bold hover:bg-slate-200">초기화</button>
                            </div>
                          </div>
                          <div className="space-y-2 mt-2">
                            {(reportData.liability.paymentLiability || []).map((item, idx) => (
                              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 relative group">
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                  <button type="button" onClick={() => {
                                    if (idx > 0) {
                                      const newList = [...reportData.liability.paymentLiability];
                                      [newList[idx - 1], newList[idx]] = [newList[idx], newList[idx - 1]];
                                      updateReportField('liability.paymentLiability', newList);
                                    }
                                  }} className="p-1 text-slate-400 hover:text-slate-600" title="위로"><ArrowUp size={14}/></button>
                                  <button type="button" onClick={() => {
                                    if (idx < reportData.liability.paymentLiability.length - 1) {
                                      const newList = [...reportData.liability.paymentLiability];
                                      [newList[idx + 1], newList[idx]] = [newList[idx], newList[idx + 1]];
                                      updateReportField('liability.paymentLiability', newList);
                                    }
                                  }} className="p-1 text-slate-400 hover:text-slate-600" title="아래로"><ArrowDown size={14}/></button>
                                  <button type="button" onClick={() => {
                                    setNewPayLiab(item);
                                    updateReportField('liability.paymentLiability', reportData.liability.paymentLiability.filter((_, i) => i !== idx));
                                  }} className="p-1 text-blue-400 hover:text-blue-600" title="수정"><Edit2 size={14}/></button>
                                  <button type="button" onClick={() => updateReportField('liability.paymentLiability', reportData.liability.paymentLiability.filter((_, i) => i !== idx))} className="p-1 text-red-400 hover:text-red-600" title="삭제"><Trash2 size={14}/></button>
                                </div>
                                <p className="text-xs font-black text-indigo-600 mb-1">{item.title}</p>
                                <p className="text-sm text-slate-600 whitespace-pre-wrap">{item.content}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </FormSection>
                  </div>
                </div>
              ) : (
                /* 리포트 미리보기 */
                <div className="space-y-6 flex flex-col items-center">
                  {/* 스타일 조절 툴바 */}
                  <div 
                    onMouseEnter={() => {
                      const sel = window.getSelection();
                      if (sel && sel.rangeCount > 0 && !sel.isCollapsed) previewSavedRange.current = sel.getRangeAt(0);
                    }}
                    className="w-full max-w-[21cm] flex flex-wrap items-center gap-6 bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm print:hidden animate-in slide-in-from-top-4 sticky top-0 z-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">문단 정렬</span>
                      <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button 
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => {
                            const sel = window.getSelection();
                            const range = previewSavedRange.current || (sel.rangeCount > 0 ? sel.getRangeAt(0) : null);
                            if (range) {
                              let node = range.startContainer;
                              while (node && node.nodeType !== 1) node = node.parentNode;
                              const editable = node ? node.closest('[contenteditable="true"]') : null;
                              if (editable) {
                                editable.focus();
                                sel.removeAllRanges();
                                sel.addRange(range);
                                document.execCommand('justifyLeft');
                              }
                            }
                          }} 
                          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 transition-all" 
                          title="왼쪽 정렬"
                        >
                          <AlignLeft size={18}/>
                        </button>
                        <button 
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => {
                            const sel = window.getSelection();
                            const range = previewSavedRange.current || (sel.rangeCount > 0 ? sel.getRangeAt(0) : null);
                            if (range) {
                              let node = range.startContainer;
                              while (node && node.nodeType !== 1) node = node.parentNode;
                              const editable = node ? node.closest('[contenteditable="true"]') : null;
                              if (editable) {
                                editable.focus();
                                sel.removeAllRanges();
                                sel.addRange(range);
                                document.execCommand('justifyCenter');
                              }
                            }
                          }} 
                          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 transition-all" 
                          title="가운데 정렬"
                        >
                          <AlignCenter size={18}/>
                        </button>
                        <button 
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => {
                            const sel = window.getSelection();
                            const range = previewSavedRange.current || (sel.rangeCount > 0 ? sel.getRangeAt(0) : null);
                            if (range) {
                              let node = range.startContainer;
                              while (node && node.nodeType !== 1) node = node.parentNode;
                              const editable = node ? node.closest('[contenteditable="true"]') : null;
                              if (editable) {
                                editable.focus();
                                sel.removeAllRanges();
                                sel.addRange(range);
                                document.execCommand('justifyFull');
                              }
                            }
                          }} 
                          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 transition-all" 
                          title="양쪽 정렬"
                        >
                          <AlignJustify size={18}/>
                        </button>
                      </div>
                    </div>
                    <div className="w-px h-8 bg-slate-200"></div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">줄 간격</span>
                      <input type="range" min="1.0" max="3.0" step="0.1" value={reportStyles.lineHeight} onChange={e => setReportStyles(prev => ({...prev, lineHeight: e.target.value}))} className="w-32 accent-indigo-600 cursor-pointer" />
                      <span className="text-sm font-black text-indigo-600 w-8">{reportStyles.lineHeight}</span>
                    </div>
                    <div className="w-px h-8 bg-slate-200"></div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">선택영역 크기</span>
                      <select 
                        onMouseDown={() => {
                          const sel = window.getSelection();
                          if (sel.rangeCount > 0 && !sel.isCollapsed) {
                            previewSavedRange.current = sel.getRangeAt(0).cloneRange();
                          }
                        }}
                        onChange={e => { 
                          let range = previewSavedRange.current;
                          const sel = window.getSelection();
                          
                          if (!range && sel && sel.rangeCount > 0 && !sel.isCollapsed) {
                            range = sel.getRangeAt(0);
                          }

                          if (!range) {
                            alert("크기를 변경할 글자를 마우스로 드래그하여 선택해주세요.");
                            e.target.value = "";
                            return;
                          }

                          let size = e.target.value;
                          if (size === 'custom') {
                            const customSize = window.prompt("글자 크기를 입력하세요 (숫자만 입력 시 pt로 적용됩니다)", "11");
                            if (customSize) size = isNaN(customSize) ? customSize : customSize + 'pt';
                            else { e.target.value = ""; return; }
                          }

                          // 1. 포커스 복구
                          let node = range.startContainer;
                          while (node && node.nodeType !== 1 && node.parentNode) node = node.parentNode;
                          const editable = node ? node.closest('[contenteditable="true"]') : null;
                          if (editable) {
                            editable.focus();
                            sel.removeAllRanges();
                            sel.addRange(range);
                          }
                          
                          document.execCommand('styleWithCSS', null, false);
                          document.execCommand('fontSize', false, '7');
                          if (editable) {
                            const fontEls = editable.querySelectorAll('font[size="7"]');
                            fontEls.forEach(el => {
                              el.removeAttribute('size');
                              el.style.fontSize = size;
                            });
                          }

                          previewSavedRange.current = null;
                          e.target.value = ""; 
                          e.target.blur(); // 드롭다운 포커스 해제
                        }} 
                        className="bg-slate-100 border-none rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                        value=""
                      >
                        <option value="" disabled>크기 선택</option>
                        <option value="custom">직접 입력</option>
                        {['9pt', '10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '20pt', '24pt', '30pt', '36pt'].map(size => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-px h-8 bg-slate-200"></div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">문단 편집</span>
                      <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                        <button 
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => document.execCommand('bold')}
                          className={`p-2 rounded-lg transition-all ${customStyles[selectedElementId]?.bold ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                          title="굵게"
                        >
                          <Bold size={18}/>
                        </button>
                        <div className="relative group">
                          <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 transition-all" title="색상">
                            <Palette size={18}/>
                          </button>
                          <div className="absolute top-full left-0 mt-2 hidden group-hover:flex bg-white border border-slate-200 p-2 rounded-xl shadow-xl z-50 gap-1">
                            {['#000000', '#ef4444', '#2563eb', '#059669', '#7c3aed'].map(color => (
                              <button 
                                key={color}
                                onClick={() => {
                                  if(!selectedElementId) return;
                                  setCustomStyles(prev => ({
                                    ...prev,
                                    [selectedElementId]: { ...prev[selectedElementId], color }
                                  }));
                                }}
                                className="w-6 h-6 rounded-full border border-slate-200"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>
                        <button 
                          onClick={() => { setCustomStyles({}); setSelectedElementId(null); }}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-500 transition-all"
                          title="스타일 초기화"
                        >
                          <Eraser size={18}/>
                        </button>
                      </div>
                      {selectedElementId && <span className="text-[10px] font-bold text-indigo-500 animate-pulse">문단 선택됨</span>}
                    </div>
                  </div>

                  <div 
                    id="print-area" 
                    className="bg-white p-12 shadow-2xl min-h-[29.7cm] mx-auto max-w-[21cm] border border-slate-200 print:shadow-none print:p-0 print:border-none print:m-0"
                    onClick={() => setSelectedElementId(null)}
                    style={{ 
                      lineHeight: reportStyles.lineHeight,
                      fontSize: '11pt',
                      wordBreak: 'keep-all'
                    }}
                  >
                    <div className="flex justify-end items-start mb-20 px-4">
                      <span className="text-xs text-slate-400">사단법인 한국손해사정사회 정회원 양식</span>
                    </div>
                    <h1
                      className="text-5xl font-extrabold tracking-[0.2em] mb-4 outline-none text-center"
                      contentEditable
                      suppressContentEditableWarning={true}
                      onBlur={e => updateReportField('reportTitle', e.target.innerHTML)}
                      dangerouslySetInnerHTML={{ __html: reportData.reportTitle || "손 해 사 정 서" }}
                    ></h1>
                    <div className="text-center mb-32">
                      <p 
                        className="text-slate-500 font-medium tracking-widest border-y border-slate-200 py-3 inline-block px-12 uppercase outline-none focus:bg-blue-50"
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={e => updateReportField('labels.subtitle', e.target.innerHTML)}
                        dangerouslySetInnerHTML={{ __html: reportData.labels?.subtitle || "The Claim Adjustment Report" }}
                      />
                    </div>
                    <div className="max-w-md mx-auto text-left space-y-10 mt-20">
                      <div className="border-b-2 border-slate-900 pb-3">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.subject', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.subject || "Subject" }} />
                        <p className="text-xl font-bold">
                          <span contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.subjectPrefix', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.subjectPrefix || "피해자 " }} />
                          <span contentEditable suppressContentEditableWarning onBlur={e => updateReportField('engagement.victim.name', e.target.innerHTML)} className="outline-none focus:bg-blue-50 px-1 rounded" dangerouslySetInnerHTML={{ __html: reportData.engagement.victim.name }} />
                          <span contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.subjectSuffix', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.subjectSuffix || " 사고건" }} />
                        </p>
                      </div>
                      <div className="border-b-2 border-slate-900 pb-3">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.date', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.date || "Date" }} />
                        <p className="text-xl font-bold outline-none focus:bg-blue-50 px-1 rounded" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('engagement.assignedDate', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.engagement.assignedDate }} />
                      </div>
                      <div className="border-b-2 border-slate-900 pb-3">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.insurer', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.insurer || "Insurer" }} />
                        <p className="text-xl font-bold outline-none focus:bg-blue-50 px-1 rounded" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('policy.insurer', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.policy.insurer }} />
                      </div>
                    </div>
                    <div className="mt-60 font-bold text-3xl outline-none text-center" contentEditable suppressContentEditableWarning={true} onBlur={e => updateReportField('company.name', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.company.name }}></div>
                  <div className="page-break h-2" />
                  <div className="py-10">
                    <h2 className="text-xl font-bold mb-6 border-l-4 border-slate-900 pl-3 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.section1', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.section1 || "1. 위임자 및 피해자 인적사항" }} />
                    <div className="grid grid-cols-4 border-t-2 border-l border-slate-900 text-sm">
                      <div className="bg-slate-100 p-3 border-b border-r border-slate-900 font-bold col-span-4 text-center outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.mandatorHeader', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.mandatorHeader || "위임자" }} />
                      <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.name', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.name || "성명" }} /><div className="p-3 border-b border-r border-slate-900 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('engagement.mandator.name', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.engagement.mandator.name }} />
                      <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.birth', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.birth || "생년월일" }} /><div className="p-3 border-b border-r border-slate-900 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('engagement.mandator.birthDate', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.engagement.mandator.birthDate }} />
                      <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.residentNo', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.residentNo || "주민등록번호" }} /><div className="p-3 border-b border-r border-slate-900 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('engagement.mandator.residentNo', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.engagement.mandator.residentNo }} />
                      <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.phone', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.phone || "연락처" }} /><div className="p-3 border-b border-r border-slate-900 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('engagement.mandator.phone', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.engagement.mandator.phone }} />
                      <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.job', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.job || "직업" }} /><div className="p-3 border-b border-r border-slate-900 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('engagement.mandator.job', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.engagement.mandator.job }} />
                      <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.relation', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.relation || "관계" }} /><div className="p-3 border-b border-r border-slate-900 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('engagement.mandator.relation', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.engagement.mandator.relation }} />
                      <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.address', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.address || "주소" }} /><div className="p-3 border-b border-r border-slate-900 col-span-3 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('engagement.mandator.address', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.engagement.mandator.address }} />

                      <div className="bg-slate-100 p-3 border-b border-r border-slate-900 font-bold col-span-4 text-center outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.victimHeader', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.victimHeader || "피해자(피보험자)" }} />
                      <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.name', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.name || "성명" }} /><div className="p-3 border-b border-r border-slate-900 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('engagement.victim.name', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.engagement.victim.name }} />
                      <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.birth', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.birth || "생년월일" }} /><div className="p-3 border-b border-r border-slate-900 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('engagement.victim.birthDate', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.engagement.victim.birthDate }} />
                      <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.residentNo', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.residentNo || "주민등록번호" }} /><div className="p-3 border-b border-r border-slate-900 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('engagement.victim.residentNo', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.engagement.victim.residentNo }} />
                      <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.phone', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.phone || "연락처" }} /><div className="p-3 border-b border-r border-slate-900 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('engagement.victim.phone', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.engagement.victim.phone }} />
                      <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.job', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.job || "직업" }} /><div className="p-3 border-b border-r border-slate-900 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('engagement.victim.job', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.engagement.victim.job }} />
                      <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.relation', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.relation || "관계" }} /><div className="p-3 border-b border-r border-slate-900 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('engagement.victim.relation', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.engagement.victim.relation }} />
                      <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.address', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.address || "주소" }} /><div className="p-3 border-b border-r border-slate-900 col-span-3 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('engagement.victim.address', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.engagement.victim.address }} />
                    </div>
                    <h2 className="text-xl font-bold mb-6 border-l-4 border-slate-900 pl-3 mt-16 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.section2', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.section2 || "2. 보험계약사항" }} />
                    <div className="grid grid-cols-4 border-t-2 border-l border-slate-900 text-sm">
                      <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.insurer', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.insurer || "보험회사" }} /><div className="p-3 border-b border-r border-slate-900 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('policy.insurer', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.policy.insurer }} />
                      <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.item', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.item || "보험종목" }} /><div className="p-3 border-b border-r border-slate-900 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('policy.item', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.policy.item }} />

                      <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.productName', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.productName || "보험상품명" }} /><div className="p-3 border-b border-r border-slate-900 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('policy.productName', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.policy.productName }} />
                      <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.policyNo', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.policyNo || "증권번호" }} /><div className="p-3 border-b border-r border-slate-900 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('policy.policyNo', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.policy.policyNo }} />
                      <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.contractor', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.contractor || "계약자" }} /><div className="p-3 border-b border-r border-slate-900 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('policy.contractor', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.policy.contractor }} />
                      <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.insured', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.insured || "피보험자" }} /><div className="p-3 border-b border-r border-slate-900 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('policy.insured', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.policy.insured }} />
                      <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.phone', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.phone || "연락처" }} /><div className="p-3 border-b border-r border-slate-900 col-span-3 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('policy.phone', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.policy.phone }} />
                      <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.address', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.address || "주소" }} /><div className="p-3 border-b border-r border-slate-900 col-span-3 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('policy.address', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.policy.address }} />
                      <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.period', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.period || "보험기간" }} /><div className="p-3 border-b border-r border-slate-900 col-span-3 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('policy.period', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.policy.period }} />
                      <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.limit', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.limit || "보상한도/자부담" }} /><div className="p-3 border-b border-r border-slate-900 col-span-3 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('policy.limitDeductible', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.policy.limitDeductible }} />
                      <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.coverage', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.coverage || "담보내용" }} /><div className="p-3 border-b border-r border-slate-900 col-span-3 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('policy.coverageDetails', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.policy.coverageDetails }} />
                      <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.other', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.other || "기타사항" }} /><div className="p-3 border-b border-r border-slate-900 col-span-3 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('policy.otherDetails', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.policy.otherDetails }} />
                    </div>
                    <h2 className="text-xl font-bold mb-6 border-l-4 border-slate-900 pl-3 mt-16 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.section3', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.section3 || "3. 사고사항" }} />
                    <div className="border-t-2 border-slate-900 text-sm">
                      <div className="bg-slate-50 p-3 border-b border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.overview', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.overview || "사고개요" }} />
                      <div className="p-4 border-b border-slate-900 min-h-[50px] whitespace-pre-wrap leading-relaxed outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('accident.overview', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.accident.overview }} />
                      <div className="grid grid-cols-4">
                        <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.time', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.time || "사고일시" }} /><div className="p-3 border-b border-r border-slate-900 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('accident.time', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.accident.time }} />
                        <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.place', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.place || "사고장소" }} /><div className="p-3 border-b border-slate-900 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('accident.place', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.accident.place }} />
                      </div>
                      <div className="bg-slate-50 p-3 border-b border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.cause', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.cause || "사고원인" }} />
                      <div className="p-3 border-b border-slate-900 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('accident.cause', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.accident.cause }} />
                      <div className="bg-slate-50 p-3 border-b border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.details', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.details || "사고내용" }} />
                      <div className="p-4 border-b border-slate-900 min-h-[100px] whitespace-pre-wrap leading-relaxed outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('accident.details', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.accident.details }} />
                      <div className="bg-slate-50 p-3 border-b border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.investigation', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.investigation || "사고발생관련사항(조사내용)" }} />
                      <div className="p-4 border-b border-slate-900 min-h-[100px] whitespace-pre-wrap leading-relaxed outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('accident.investigationDetails', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.accident.investigationDetails }} />
                    </div>
                    <div className="page-break h-2" />
                    <h2 className="text-xl font-bold mb-6 border-l-4 border-slate-900 pl-3 mt-16 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.section4', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.section4 || "4. 손해내용" }} />
                    <div className="grid grid-cols-4 border-t-2 border-slate-900 text-sm">
                      <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.hospital', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.hospital || "병원명" }} /><div className="p-3 border-b border-slate-900 col-span-3 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('damage.hospital', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.damage.hospital }} />
                      <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.diagnosis', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.diagnosis || "상병명" }} /><div className="p-3 border-b border-slate-900 col-span-3 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('damage.diagnosis', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.damage.diagnosis }} />
                      <div className="bg-slate-50 p-3 border-b border-r border-slate-900 font-bold outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.treatment', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.treatment || "치료내용" }} /><div className="p-3 border-b border-slate-900 col-span-3 min-h-[50px] whitespace-pre-wrap outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('damage.treatment', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.damage.treatment }} />
                    </div>

                    <h2 className="text-xl font-bold mb-6 border-l-4 border-slate-900 pl-3 mt-16 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.section6', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.section6 || (reportData.reportType?.startsWith('longTerm') || reportData.reportType === 'medical' ? "5. 보험사의 보험금 지급책임 검토" : "5. 손해배상책임 등 검토") }} />
                    <div className="border-2 border-slate-200 p-6 space-y-6 text-sm">
                      <div>
                        <h4 className="font-bold text-blue-800 mb-2">가. {reportData.reportType?.startsWith('longTerm') || reportData.reportType === 'medical' ? "보험사의 보험금 지급책임" : "피보험자 손해배상책임"} (<span contentEditable suppressContentEditableWarning onBlur={e => updateReportField('liability.liabilityStatus', e.target.innerHTML)} className="outline-none focus:bg-blue-50 px-1 rounded" dangerouslySetInnerHTML={{ __html: reportData.liability.liabilityStatus }} />)</h4>
                        <div className="space-y-2">
                          <p className="font-bold text-slate-700">1) 약관상 보험자 지급책임 근거</p>
                          <div className="ml-5 space-y-2">
                            {(reportData.liability.policyLiabilityBasis || []).map((item, idx) => (
                              <div 
                                key={idx} 
                                className={`relative group/item transition-all ${selectedElementId === `policy-${idx}` ? 'ring-2 ring-indigo-500 ring-inset rounded-lg' : ''}`} 
                                onClick={(e) => { e.stopPropagation(); setSelectedElementId(`policy-${idx}`); }} 
                                style={{ 
                                  color: customStyles[`policy-${idx}`]?.color || 'inherit', 
                                  fontWeight: customStyles[`policy-${idx}`]?.bold ? 'bold' : 'normal' 
                                }}
                              >
                                {typeof item === 'string' ? (
                                  <p className="leading-relaxed">{item}</p>
                                ) : (
                                  <>
                                    <p className="font-bold text-slate-600 text-xs">[<span contentEditable suppressContentEditableWarning onBlur={e => updateReportListIndex('liability.legalLiabilityBasis', idx, 'title', e.target.innerHTML)} className="outline-none focus:bg-blue-50 px-1 rounded" dangerouslySetInnerHTML={{ __html: item.title }} />]</p>
                                    <p className="leading-relaxed outline-none focus:bg-blue-50 px-1 rounded" contentEditable suppressContentEditableWarning onBlur={e => updateReportListIndex('liability.legalLiabilityBasis', idx, 'content', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: item.content }} />
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                          <p className="font-bold text-slate-700 mt-2">2) 법률상 지급책임</p>
                          <div className="ml-5 space-y-2">
                            {(reportData.liability.legalLiabilityBasis || []).map((item, idx) => (
                              <div 
                                key={idx}
                                className={`relative group/item transition-all ${selectedElementId === `legal-${idx}` ? 'ring-2 ring-indigo-500 ring-inset rounded-lg' : ''}`}
                                onClick={(e) => { e.stopPropagation(); setSelectedElementId(`legal-${idx}`); }}
                                style={{ 
                                  color: customStyles[`legal-${idx}`]?.color || 'inherit', 
                                  fontWeight: customStyles[`legal-${idx}`]?.bold ? 'bold' : 'normal' 
                                }}
                              >
                                {typeof item === 'string' ? (
                                  <p className="leading-relaxed">{item}</p>
                                ) : (
                                  <>
                                    <p className="font-bold text-slate-600 text-xs">[<span contentEditable suppressContentEditableWarning onBlur={e => updateReportListIndex('liability.policyLiabilityBasis', idx, 'title', e.target.innerHTML)} className="outline-none focus:bg-blue-50 px-1 rounded" dangerouslySetInnerHTML={{ __html: item.title }} />]</p>
                                    <p className="leading-relaxed outline-none focus:bg-blue-50 px-1 rounded" contentEditable suppressContentEditableWarning onBlur={e => updateReportListIndex('liability.policyLiabilityBasis', idx, 'content', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: item.content }} />
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {(reportData.reportType === 'liability' || reportData.reportType === 'auto') && (
                        <div>
                          <h4 className="font-bold text-amber-800 mb-2">나. 피해자의 과실상계 (과실 <span contentEditable suppressContentEditableWarning onBlur={e => updateReportField('liability.faultPercent', e.target.innerHTML)} className="outline-none focus:bg-blue-50 px-1 rounded" dangerouslySetInnerHTML={{ __html: reportData.liability.faultPercent }} />%)</h4>
                        </div>
                      )}
                      
                      <div>
                        <h4 className="font-bold text-slate-800 mb-2">{reportData.reportType?.startsWith('longTerm') || reportData.reportType === 'medical' ? "나. 보험사의 보험금 지급책임" : "다. 보험사의 보험금 지급책임"}</h4>
                        <div className="space-y-4">
                          {(reportData.liability.paymentLiability || []).map((item, idx) => (
                            <div 
                              key={idx}
                              className={`relative group/item transition-all ${selectedElementId === `pay-${idx}` ? 'ring-2 ring-indigo-500 ring-inset rounded-lg' : ''}`}
                              onClick={(e) => { e.stopPropagation(); setSelectedElementId(`pay-${idx}`); }}
                              style={{ 
                                color: customStyles[`pay-${idx}`]?.color || 'inherit', 
                                fontWeight: customStyles[`pay-${idx}`]?.bold ? 'bold' : 'normal' 
                              }}
                            >
                              <p 
                                className="leading-relaxed whitespace-pre-wrap pl-2 outline-none focus:bg-blue-50 px-1 rounded" 
                                contentEditable 
                                suppressContentEditableWarning 
                                onBlur={e => updateReportListIndex('liability.paymentLiability', idx, 'content', e.target.innerHTML)}
                                dangerouslySetInnerHTML={{ __html: item.content }}
                              ></p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-32 text-right">
                      <p className="text-lg mb-10 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.confirmation', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.confirmation || "위와 같이 정당하게 손해사정 하였음을 확인합니다." }} />
                      <p className="text-2xl font-bold mb-2 outline-none" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('company.name', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.company.name }} />
                      <div className="flex justify-end gap-12 mt-4">
                        <div className="text-left"><p className="text-xs text-slate-400 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.rep', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.rep || "대표 손해사정사" }} />
                        <div className="relative inline-block min-w-[100px]">
                          <p className="font-bold text-lg"><span contentEditable suppressContentEditableWarning onBlur={e => updateReportField('company.repName', e.target.innerHTML)} className="outline-none focus:bg-blue-50 px-1 rounded" dangerouslySetInnerHTML={{ __html: reportData.company.repName }} /> (인)</p>
                          {(reportData.company.stampUrl || profile?.stampUrl) && (
                            <img 
                              key={`preview-${reportData.company.stampUrl || profile?.stampUrl}`}
                              src={reportData.company.stampUrl || profile?.stampUrl} 
                              className="absolute -top-5 -right-5 w-16 h-16 object-contain z-30 pointer-events-none mix-blend-multiply" 
                              style={{ maxWidth: 'none' }}
                              alt="직인"
                            />
                          )}
                        </div>
                        <p className="text-[10px]" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('company.regNo', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.company.regNo }} /></div>
                        {reportData.company.investigator && (
                          <div className="text-left"><p className="text-xs text-slate-400 outline-none focus:bg-blue-50" contentEditable suppressContentEditableWarning onBlur={e => updateReportField('labels.investigator', e.target.innerHTML)} dangerouslySetInnerHTML={{ __html: reportData.labels?.investigator || "담당 조사자" }} /><p className="font-bold text-lg"><span contentEditable suppressContentEditableWarning onBlur={e => updateReportField('company.investigator', e.target.innerHTML)} className="outline-none focus:bg-blue-50 px-1 rounded" dangerouslySetInnerHTML={{ __html: reportData.company.investigator }} /> (서명)</p></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              )}
            </div>
          )}

          {/* STANDALONE CALCULATOR */}
          {view === 'calculator' && (
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 print:p-0">
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 print:hidden">
                <div className="flex items-center gap-4 mb-10">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Calculator size={28}/></div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">손해배상금 산출기</h3>
                    <p className="text-sm font-bold text-slate-400">항목별 금액과 과실비율을 입력하여 예상 배상금을 산출합니다.</p>
                  </div>
                </div>

                {/* 기본 정보 섹션 추가 */}
                <div className="mb-10 p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                  {/* 데이터 연동 UI */}
                  <div className="flex flex-col md:flex-row gap-4 mb-8 pb-8 border-b border-slate-200">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-black text-slate-400 uppercase px-1 tracking-widest">연동할 고객 선택</label>
                      <select 
                        className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        value={selectedCalcCaseId}
                        onChange={(e) => setSelectedCalcCaseId(e.target.value)}
                      >
                        <option value="">사건 관리대장에서 고객 선택...</option>
                        {cases.map(c => (
                          <option key={c.id} value={c.id}>{c.clientName} ({c.insuranceCompany || '보험사 미정'})</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end gap-2">
                      <button onClick={handleLoadStandaloneCalc} className="px-6 py-3 bg-slate-800 text-white rounded-xl text-xs font-black hover:bg-black transition-all flex items-center gap-2"><History size={16}/> 불러오기</button>
                      <button onClick={handleSaveStandaloneCalc} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 shadow-lg transition-all flex items-center gap-2"><Save size={16}/> 데이터 저장</button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-6 border-l-4 border-indigo-500 pl-4">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">사고 및 피해자 기본 정보</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase px-1">사고일자</label><input type="date" className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs outline-none" value={standaloneCalc.accidentDate} onChange={e=>{
                      const months = calculateWorkMonths(standaloneCalc.birthDate, e.target.value);
                      const hCoeff = calculateHoffman(months);
                      setStandaloneCalc({...standaloneCalc, accidentDate: e.target.value, workMonths: months, hoffman: hCoeff});
                    }}/></div>
                    <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase px-1">피해자명</label><input type="text" className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs outline-none" value={standaloneCalc.victimName} onChange={e=>setStandaloneCalc({...standaloneCalc, victimName: e.target.value})}/></div>
                    <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase px-1">생년월일</label><input type="date" className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs outline-none" value={standaloneCalc.birthDate} onChange={e=>{
                      const months = calculateWorkMonths(e.target.value, standaloneCalc.accidentDate);
                      const hCoeff = calculateHoffman(months);
                      setStandaloneCalc({...standaloneCalc, birthDate: e.target.value, workMonths: months, hoffman: hCoeff});
                    }}/></div>
                    <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase px-1">직업</label><input type="text" className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs outline-none" value={standaloneCalc.occupation} onChange={e=>setStandaloneCalc({...standaloneCalc, occupation: e.target.value})}/></div>
                    
                    <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase px-1">월 소득 (₩)</label>
                      <input type="text" className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs outline-none text-indigo-600" 
                        value={formatComma(standaloneCalc.monthlyIncome)} 
                        onChange={e=>setStandaloneCalc({...standaloneCalc, monthlyIncome: unformatComma(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2 lg:col-span-3"><label className="text-xs font-black text-slate-400 uppercase px-1">상병명</label><input type="text" className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs outline-none" value={standaloneCalc.diagnosis} onChange={e=>setStandaloneCalc({...standaloneCalc, diagnosis: e.target.value})}/></div>
                    
                    <div className="space-y-1 md:col-span-2"><label className="text-xs font-black text-slate-400 uppercase px-1">입원기간 (시작 ~ 종료)</label>
                      <div className="flex gap-2 items-center">
                        <input type="date" className="flex-1 bg-white border border-slate-200 px-3 py-2.5 rounded-xl font-bold text-xs outline-none" value={standaloneCalc.hospStartDate} onChange={e=>{
                          const days = getDiffDays(e.target.value, standaloneCalc.hospEndDate);
                          setStandaloneCalc({...standaloneCalc, hospStartDate: e.target.value, hospDays: days, lostWagesDays: days});
                        }}/>
                        <span className="text-slate-300">~</span>
                        <input type="date" className="flex-1 bg-white border border-slate-200 px-3 py-2.5 rounded-xl font-bold text-xs outline-none" value={standaloneCalc.hospEndDate} onChange={e=>{
                          const days = getDiffDays(standaloneCalc.hospStartDate, e.target.value);
                          setStandaloneCalc({...standaloneCalc, hospEndDate: e.target.value, hospDays: days, lostWagesDays: days});
                        }}/>
                      </div>
                    </div>
                    <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase px-1">입원 총 일수</label><input type="number" className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs outline-none text-indigo-600" value={standaloneCalc.hospDays} onChange={e=>{
                      const val = Number(e.target.value);
                      setStandaloneCalc({...standaloneCalc, hospDays: val, lostWagesDays: val});
                    }}/></div>
                    
                    <div className="space-y-1 md:col-span-2"><label className="text-xs font-black text-slate-400 uppercase px-1">통원기간 (시작 ~ 종료)</label>
                      <div className="flex gap-2 items-center">
                        <input type="date" className="flex-1 bg-white border border-slate-200 px-3 py-2.5 rounded-xl font-bold text-xs outline-none" value={standaloneCalc.outStartDate} onChange={e=>{
                          const days = getDiffDays(e.target.value, standaloneCalc.outEndDate);
                          setStandaloneCalc({...standaloneCalc, outStartDate: e.target.value, outDays: days});
                        }}/>
                        <span className="text-slate-300">~</span>
                        <input type="date" className="flex-1 bg-white border border-slate-200 px-3 py-2.5 rounded-xl font-bold text-xs outline-none" value={standaloneCalc.outEndDate} onChange={e=>{
                          const days = getDiffDays(standaloneCalc.outStartDate, e.target.value);
                          setStandaloneCalc({...standaloneCalc, outEndDate: e.target.value, outDays: days});
                        }}/>
                      </div>
                    </div>
                    <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase px-1">통원 총 일수</label><input type="number" className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs outline-none text-indigo-600" value={standaloneCalc.outDays} onChange={e=>setStandaloneCalc({...standaloneCalc, outDays: Number(e.target.value)})}/></div>
                    
                    <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase px-1">초진주수 (주)</label><input type="number" className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs outline-none" value={standaloneCalc.initialWeeks} onChange={e=>setStandaloneCalc({...standaloneCalc, initialWeeks: e.target.value})}/></div>
                    <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase px-1">상해등급</label><input type="text" className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs outline-none" value={standaloneCalc.injuryGrade} onChange={e=>setStandaloneCalc({...standaloneCalc, injuryGrade: e.target.value})}/></div>
                    
                    <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase px-1">장해등급</label><input type="text" className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs outline-none" value={standaloneCalc.disabilityGrade} onChange={e=>setStandaloneCalc({...standaloneCalc, disabilityGrade: e.target.value})}/></div>
                    <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase px-1">노동능력상실률 (%)</label><input type="number" className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs outline-none" value={standaloneCalc.lossRate} onChange={e=>setStandaloneCalc({...standaloneCalc, lossRate: e.target.value})}/></div>
                    <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase px-1">취업가능월수</label><input type="number" className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs outline-none" value={standaloneCalc.workMonths} onChange={e=>{
                      const m = Number(e.target.value);
                      setStandaloneCalc({...standaloneCalc, workMonths: m, hoffman: calculateHoffman(m)});
                    }}/></div>
                    <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase px-1">호프만계수</label>
                      <input type="number" step="0.0001" className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs outline-none" 
                        value={standaloneCalc.hoffman} 
                        onChange={e=>setStandaloneCalc({...standaloneCalc, hoffman: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {Object.entries(assessmentLabels).map(([key, label]) => (
                      <div key={key} className="space-y-2">
                        <div className="flex justify-between items-end px-2">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</label>
                            {key === 'nursingExpenses' && (
                              <span className="text-[8px] font-black px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600">기준 일수 및 임금 수정 가능</span>
                            )}
                            {key === 'lostWages' && (
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => {
                                    const isTurningOn = !standaloneCalc.isLostWagesManual;
                                    setStandaloneCalc(prev => ({
                                      ...prev, 
                                      isLostWagesManual: isTurningOn,
                                      ...(isTurningOn ? { 
                                        lostWagesPeriods: prev.lostWagesPeriods?.length > 0 ? prev.lostWagesPeriods : [{ income: prev.monthlyIncome, days: prev.lostWagesDays, multiplier: prev.lostWagesMultiplier || 0.85 }] 
                                      } : {})
                                    }));
                                  }}
                                  className={`text-[8px] font-black px-2 py-0.5 rounded-md transition-all ${standaloneCalc.isLostWagesManual ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-200 text-slate-500'}`}
                                >
                                  {standaloneCalc.isLostWagesManual ? '수동 입력 중' : '자동 계산 중'}
                                </button>
                                {!standaloneCalc.isLostWagesManual && (
                                  <button 
                                    onClick={() => setStandaloneCalc(prev => ({
                                      ...prev,
                                      isLostWagesManual: true,
                                      lostWagesPeriods: [
                                        { income: prev.monthlyIncome, days: prev.lostWagesDays, multiplier: prev.lostWagesMultiplier || 0.85 },
                                        { income: prev.monthlyIncome, days: 0, multiplier: 0.85 }
                                      ]
                                    }))}
                                    className="text-[8px] font-black px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all flex items-center gap-1"
                                  >
                                    <Plus size={10}/> 기간 추가
                                  </button>
                                )}
                              </div>
                            )}
                            {key === 'lostEarnings' && (
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => {
                                    const isTurningOn = !standaloneCalc.isLostEarningsManual;
                                    setStandaloneCalc(prev => ({
                                      ...prev, 
                                      isLostEarningsManual: isTurningOn,
                                      ...(isTurningOn ? { 
                                        lostEarningsPeriods: prev.lostEarningsPeriods?.length > 0 ? prev.lostEarningsPeriods : [{ income: prev.monthlyIncome, rate: prev.lossRate, hoffman: prev.hoffman }] 
                                      } : {})
                                    }));
                                  }}
                                  className={`text-[8px] font-black px-2 py-0.5 rounded-md transition-all ${standaloneCalc.isLostEarningsManual ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-200 text-slate-500'}`}
                                >
                                  {standaloneCalc.isLostEarningsManual ? '수동 입력 중' : '자동 계산 중'}
                                </button>
                                {!standaloneCalc.isLostEarningsManual && (
                                  <button 
                                    onClick={() => setStandaloneCalc(prev => ({
                                      ...prev,
                                      isLostEarningsManual: true,
                                      lostEarningsPeriods: [
                                        { income: prev.monthlyIncome, rate: prev.lossRate, hoffman: prev.hoffman },
                                        { income: prev.monthlyIncome, rate: 0, hoffman: 0 }
                                      ]
                                    }))}
                                    className="text-[8px] font-black px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all flex items-center gap-1"
                                  >
                                    <Plus size={10}/> 기간 추가
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {key === 'nursingExpenses' && (
                          <div className="mt-2 space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400">간병일수 (일)</label>
                                <input type="number" className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-black outline-none text-indigo-600" value={standaloneCalc.nursingDays} onChange={e => setStandaloneCalc({...standaloneCalc, nursingDays: Number(e.target.value)})} />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400">적용 일당 (미입력 시 월소득/25)</label>
                                <input type="text" className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-black outline-none text-indigo-600" placeholder={formatComma(Math.floor(standaloneCalc.monthlyIncome / 25))} value={formatComma(standaloneCalc.nursingDailyWage)} onChange={e => setStandaloneCalc({...standaloneCalc, nursingDailyWage: unformatComma(e.target.value)})} />
                              </div>
                            </div>
                          </div>
                        )}

                        {key === 'transportationExpenses' && (
                          <div className="mt-2 space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400">통원일수 (일)</label>
                                <input type="number" className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-black outline-none text-indigo-600" value={standaloneCalc.transportationDays} onChange={e => setStandaloneCalc({...standaloneCalc, transportationDays: Number(e.target.value)})} />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400">교통비 단가 (원)</label>
                                <input type="text" className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-black outline-none text-indigo-600" value={formatComma(standaloneCalc.transportationDailyRate)} onChange={e => setStandaloneCalc({...standaloneCalc, transportationDailyRate: unformatComma(e.target.value)})} />
                              </div>
                            </div>
                          </div>
                        )}

                        {key === 'lostWages' && (
                          <div className="mt-2 space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            {!standaloneCalc.isLostWagesManual ? (
                              <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-400">월 소득액</label>
                                  <input type="text" className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-black outline-none" value={formatComma(standaloneCalc.monthlyIncome)} onChange={e => setStandaloneCalc({...standaloneCalc, monthlyIncome: unformatComma(e.target.value)})} />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-400">휴업일수</label>
                                  <input type="number" className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-black outline-none" value={standaloneCalc.lostWagesDays} onChange={e => setStandaloneCalc({...standaloneCalc, lostWagesDays: Number(e.target.value)})} />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-400">계수 (예: 0.85)</label>
                                  <input type="number" step="0.01" className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-black outline-none" value={standaloneCalc.lostWagesMultiplier} onChange={e => setStandaloneCalc({...standaloneCalc, lostWagesMultiplier: e.target.value})} />
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {(standaloneCalc.lostWagesPeriods || []).map((period, pIdx) => (
                                  <div key={pIdx} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white rounded-xl border border-indigo-100 shadow-sm animate-in slide-in-from-left-2 group/item">
                                    <span className="text-[10px] font-black text-indigo-400 w-4">#{pIdx + 1}</span>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[9px] font-bold text-indigo-500">월소득:</span>
                                      <input type="text" className="w-20 bg-white border border-indigo-100 rounded-lg px-2 py-0.5 text-xs font-black text-indigo-600 outline-none" value={formatComma(period.income)} onChange={e => {
                                        const newPeriods = [...standaloneCalc.lostWagesPeriods];
                                        newPeriods[pIdx].income = unformatComma(e.target.value);
                                        setStandaloneCalc({...standaloneCalc, lostWagesPeriods: newPeriods});
                                      }} />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[9px] font-bold text-indigo-500">일수:</span>
                                      <input type="number" className="w-12 bg-white border border-indigo-100 rounded-lg px-2 py-0.5 text-xs font-black text-indigo-600 outline-none" value={period.days} onChange={e => {
                                        const newPeriods = [...standaloneCalc.lostWagesPeriods];
                                        newPeriods[pIdx].days = Number(e.target.value);
                                        setStandaloneCalc({...standaloneCalc, lostWagesPeriods: newPeriods});
                                      }} />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[9px] font-bold text-indigo-500">계수:</span>
                                      <input type="number" step="0.01" className="w-12 bg-white border border-indigo-100 rounded-lg px-2 py-0.5 text-xs font-black text-indigo-600 outline-none" value={period.multiplier} onChange={e => {
                                        const newPeriods = [...standaloneCalc.lostWagesPeriods];
                                        newPeriods[pIdx].multiplier = e.target.value;
                                        setStandaloneCalc({...standaloneCalc, lostWagesPeriods: newPeriods});
                                      }} />
                                    </div>
                                    <button onClick={() => setStandaloneCalc(prev => ({...prev, lostWagesPeriods: prev.lostWagesPeriods.filter((_, i) => i !== pIdx)}))} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                                  </div>
                                ))}
                                <button onClick={() => setStandaloneCalc(prev => ({...prev, lostWagesPeriods: [...(prev.lostWagesPeriods || []), { income: prev.monthlyIncome, days: 0, multiplier: 0.85 }]}))} className="w-full py-2.5 border-2 border-dashed border-indigo-200 rounded-xl text-[10px] font-black text-indigo-500 hover:bg-indigo-50 hover:border-indigo-400 transition-all flex items-center justify-center gap-2 shadow-sm"><Plus size={14}/> 휴업 기간 추가 (입원/통원 구분 등)</button>
                              </div>
                            )}
                          </div>
                        )}

                        {key === 'lostEarnings' && (
                          <div className="mt-2 space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            {!standaloneCalc.isLostEarningsManual ? (
                              <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-400">월 소득액</label>
                                  <input type="text" className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-black outline-none" value={formatComma(standaloneCalc.monthlyIncome)} onChange={e => setStandaloneCalc({...standaloneCalc, monthlyIncome: unformatComma(e.target.value)})} />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-400">장해율 (%)</label>
                                  <input type="number" className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-black outline-none" value={standaloneCalc.lossRate} onChange={e => setStandaloneCalc({...standaloneCalc, lossRate: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-400">호프만 계수</label>
                                  <input type="number" step="0.0001" className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-black outline-none" value={standaloneCalc.hoffman} onChange={e => setStandaloneCalc({...standaloneCalc, hoffman: e.target.value})} />
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                              {(standaloneCalc.lostEarningsPeriods || []).map((period, pIdx) => (
                                <div key={pIdx} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white rounded-xl border border-indigo-100 shadow-sm animate-in slide-in-from-left-2 group/item">
                                <span className="text-[10px] font-black text-indigo-400 w-4">#{pIdx + 1}</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-[9px] font-bold text-indigo-500">월소득:</span>
                                  <input type="text" className="w-20 bg-white border border-indigo-100 rounded-lg px-2 py-0.5 text-xs font-black text-indigo-600 outline-none" value={formatComma(period.income)} onChange={e => {
                                    const newPeriods = [...standaloneCalc.lostEarningsPeriods];
                                    newPeriods[pIdx].income = unformatComma(e.target.value);
                                    setStandaloneCalc({...standaloneCalc, lostEarningsPeriods: newPeriods});
                                  }} />
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[9px] font-bold text-indigo-500">상실률(%):</span>
                                  <input type="number" className="w-12 bg-white border border-indigo-100 rounded-lg px-2 py-0.5 text-xs font-black text-indigo-600 outline-none" value={period.rate} onChange={e => {
                                    const newPeriods = [...standaloneCalc.lostEarningsPeriods];
                                    newPeriods[pIdx].rate = e.target.value;
                                    setStandaloneCalc({...standaloneCalc, lostEarningsPeriods: newPeriods});
                                  }} />
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[9px] font-bold text-indigo-500">호프만:</span>
                                  <input type="number" step="0.0001" className="w-16 bg-white border border-indigo-100 rounded-lg px-2 py-0.5 text-xs font-black text-indigo-600 outline-none" value={period.hoffman} onChange={e => {
                                    const newPeriods = [...standaloneCalc.lostEarningsPeriods];
                                    newPeriods[pIdx].hoffman = e.target.value;
                                    setStandaloneCalc({...standaloneCalc, lostEarningsPeriods: newPeriods});
                                  }} />
                                </div>
                                <button onClick={() => setStandaloneCalc(prev => ({...prev, lostEarningsPeriods: prev.lostEarningsPeriods.filter((_, i) => i !== pIdx)}))} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                              </div>
                            ))}
                            <button onClick={() => setStandaloneCalc(prev => ({...prev, lostEarningsPeriods: [...(prev.lostEarningsPeriods || []), { income: prev.monthlyIncome, rate: prev.lossRate, hoffman: 0 }]}))} className="w-full py-2.5 border-2 border-dashed border-indigo-200 rounded-xl text-[10px] font-black text-indigo-500 hover:bg-indigo-50 hover:border-indigo-400 transition-all flex items-center justify-center gap-2 shadow-sm"><Plus size={14}/> 상실 수익 기간 추가 (한시장해/영구장해 등)</button>
                          </div>
                            )}
                          </div>
                        )}
                        <div className="relative">
                          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 font-bold">₩</span>
                          <input 
                            type="text" 
                            readOnly={['lostWages', 'lostEarnings', 'nursingExpenses', 'transportationExpenses'].includes(key)}
                            className={`w-full pl-10 pr-5 py-4 border border-slate-100 rounded-2xl font-mono font-black text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${['lostWages', 'lostEarnings', 'nursingExpenses', 'transportationExpenses'].includes(key) ? 'bg-slate-100/50 cursor-default' : 'bg-slate-50'}`}
                            value={formatComma(standaloneCalc[key])}
                            onChange={e => setStandaloneCalc({...standaloneCalc, [key]: unformatComma(e.target.value)})}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-amber-500 uppercase px-2 tracking-widest">피해자 과실비율 (%)</label>
                        <input 
                          type="number" 
                          className="w-full px-5 py-4 bg-amber-50/30 border border-amber-100 rounded-2xl font-mono font-black text-xs text-amber-600 outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                          value={standaloneCalc.faultPercent}
                          onChange={e => setStandaloneCalc({...standaloneCalc, faultPercent: Number(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-rose-500 uppercase px-2 tracking-widest">절사 금액 (-)</label>
                        <input 
                          type="text" 
                          className="w-full px-5 py-4 bg-rose-50/30 border border-rose-100 rounded-2xl font-mono font-black text-xs text-rose-600 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                          value={formatComma(standaloneCalc.roundingDeduction)}
                          onChange={e => setStandaloneCalc({...standaloneCalc, roundingDeduction: unformatComma(e.target.value)})}
                        />
                      </div>
                    </div>

                    <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl">
                      <h4 className="text-indigo-400 text-xs font-black uppercase tracking-[0.2em] mb-8">Calculation Result</h4>
                      <div className="flex flex-col md:flex-row justify-between items-end gap-10">
                        <div className="space-y-6 flex-1 w-full">
                          <div className="flex justify-between items-center"><span className="text-sm font-bold text-slate-400">손해액 합계</span><span className="text-xl font-black">₩{standaloneResult.subTotal.toLocaleString()}</span></div>
                          <div className="flex justify-between items-center text-amber-400"><span className="text-sm font-bold">과실상계 ({standaloneCalc.faultPercent}%)</span><span className="text-xl font-black">- ₩{standaloneResult.faultOffset.toLocaleString()}</span></div>
                        </div>
                        <div className="flex-1 w-full pt-8 md:pt-0 border-t md:border-t-0 md:border-l border-slate-800 md:pl-10 flex flex-col md:flex-row justify-between items-end gap-6">
                          <div>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">최종 예상 배상금</p>
                            <div className="text-5xl font-black text-slate-900 tracking-tighter italic">₩{standaloneResult.finalPayment.toLocaleString()}</div>
                          </div>
                          <button onClick={() => { setStandaloneCalc({ 
                            medicalExpenses: 0, futureMedicalExpenses: 0, lostWages: 0, lostEarnings: 0, nursingExpenses: 0, transportationExpenses: 0, alimony: 0, otherDamages: 0, roundingDeduction: 0, faultPercent: 0,
                            hospStartDate: '', hospEndDate: '', outStartDate: '', outEndDate: '',
                            accidentDate: '', victimName: '', birthDate: '', occupation: '', monthlyIncome: 0,
                            diagnosis: '', hospDays: 0, outDays: 0, initialWeeks: 0,
                            injuryGrade: '', disabilityGrade: '', lossRate: 0, workMonths: 0, hoffman: 0,
                            lostWagesMultiplier: 0.85,
                            lostWagesDays: 0,
                            transportationDays: 0,
                            transportationDailyRate: 8000
                          }); setSelectedCalcCaseId(''); }} className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Reset Calculator</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CALCULATOR PRINT AREA (Visible only on print) */}
              <div id="calc-print-area" className="hidden print:block bg-white p-10 font-sans text-slate-900">
                <h1 className="text-3xl font-black text-center mb-10 underline decoration-double underline-offset-8">손해배상금 산출 내역서</h1>
                
                <section className="mb-8">
                  <h2 className="text-lg font-bold mb-4 border-l-4 border-slate-900 pl-2">1. 기본 정보</h2>
                  <table className="w-full border-collapse border border-slate-400 text-sm">
                    <tbody>
                      <tr>
                        <td className="border border-slate-400 bg-slate-50 p-2 font-bold w-1/4">피해자명</td>
                        <td className="border border-slate-400 p-2 w-1/4">{standaloneCalc.victimName}</td>
                        <td className="border border-slate-400 bg-slate-50 p-2 font-bold w-1/4">생년월일</td>
                        <td className="border border-slate-400 p-2 w-1/4">{standaloneCalc.birthDate}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 bg-slate-50 p-2 font-bold">사고일시</td>
                        <td className="border border-slate-400 p-2">{standaloneCalc.accidentDate}</td>
                        <td className="border border-slate-400 bg-slate-50 p-2 font-bold">직업</td>
                        <td className="border border-slate-400 p-2">{standaloneCalc.occupation}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 bg-slate-50 p-2 font-bold">월 소득</td>
                        <td className="border border-slate-400 p-2">₩{formatComma(standaloneCalc.monthlyIncome)}</td>
                        <td className="border border-slate-400 bg-slate-50 p-2 font-bold">상병명</td>
                        <td className="border border-slate-400 p-2">{standaloneCalc.diagnosis}</td>
                      </tr>
                    </tbody>
                  </table>
                </section>

                <section className="mb-8">
                  <h2 className="text-lg font-bold mb-4 border-l-4 border-slate-900 pl-2">2. 산출 내역 및 산식</h2>
                  <table className="w-full border-collapse border border-slate-400 text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="border border-slate-400 p-2">항목</th>
                        <th className="border border-slate-400 p-2">산식 및 근거</th>
                        <th className="border border-slate-400 p-2 text-right">금액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(assessmentLabels).map(([key, label]) => (
                        <tr key={key}>
                          <td className="border border-slate-400 p-2 font-bold">{label}</td>
                          <td className="border border-slate-400 p-2 text-sm text-slate-600">
                            {key === 'lostWages' ? `(₩${formatComma(standaloneCalc.monthlyIncome)} / 30일) * ${standaloneCalc.lostWagesDays}일 * ${standaloneCalc.lostWagesMultiplier}` : 
                             key === 'lostEarnings' ? `(₩${formatComma(standaloneCalc.monthlyIncome)} * ${standaloneCalc.lossRate}% * ${standaloneCalc.hoffman})` : 
                             key === 'nursingExpenses' ? `${standaloneCalc.nursingDays}일 (상해 ${parseInt(standaloneCalc.injuryGrade?.toString().replace(/[^0-9]/g, ""))}급)` : 
                             key === 'transportationExpenses' ? `₩${formatComma(standaloneCalc.transportationDailyRate)} * ${standaloneCalc.transportationDays}일` : '-'}
                          </td>
                          <td className="border border-slate-400 p-2 text-right">₩{formatComma(standaloneCalc[key])}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold">
                        <td className="border border-slate-400 p-2" colSpan="2">손해액 합계</td>
                        <td className="border border-slate-400 p-2 text-right">₩{formatComma(standaloneResult.subTotal)}</td>
                      </tr>
                      <tr className="text-rose-600">
                        <td className="border border-slate-400 p-2 font-bold">과실상계</td>
                        <td className="border border-slate-400 p-2 text-sm">
                          ₩{formatComma(standaloneResult.subTotal)} * {standaloneCalc.faultPercent}%
                        </td>
                        <td className="border border-slate-400 p-2 text-right">- ₩{formatComma(standaloneResult.faultOffset)}</td>
                      </tr>
                      <tr className="text-rose-600">
                        <td className="border border-slate-400 p-2 font-bold">절사 금액</td>
                        <td className="border border-slate-400 p-2 text-sm">-</td>
                        <td className="border border-slate-400 p-2 text-right">- ₩{formatComma(standaloneCalc.roundingDeduction)}</td>
                      </tr>
                      <tr className="bg-slate-900 text-white font-black text-lg">
                        <td className="p-3" colSpan="2">최종 예상 배상금</td>
                        <td className="p-3 text-right">₩{formatComma(standaloneResult.finalPayment)}</td>
                      </tr>
                    </tbody>
                  </table>
                </section>

                <div className="mt-20 text-right">
                  <p className="text-sm mb-2">작성일: {new Date().toLocaleDateString()}</p>
                  <p className="text-xl font-bold">{profile?.company || '손해사정 사무소'}</p>
                  <p className="text-lg font-bold">손해사정사 {profile?.name || '담당자'} (인)</p>
                </div>
              </div>
           </div> 
        )}
      </div>
    </main>

      {/* 사건 정보 마스터 모달 (이미지 기반 완벽 복구) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto font-sans">
          <div className="bg-white rounded-[3rem] w-full max-w-6xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="px-10 py-6 border-b flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-6">
                <h3 className="text-xl font-black text-slate-800 tracking-tighter italic underline decoration-indigo-500 decoration-4 underline-offset-8 uppercase">사건 정보 마스터 관리</h3>
                <div className="flex gap-2 ml-4">
                  <button 
                    onClick={() => { startReport(editingCase); setIsModalOpen(false); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-black hover:bg-blue-100 transition-all border border-blue-100"
                  >
                    <FileEdit size={14}/> 손해사정서 작성
                  </button>
                  <button 
                    onClick={() => { setSelectedCalcCaseId(editingCase.id); setView('calculator'); setIsModalOpen(false); }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black hover:bg-indigo-100 transition-all border border-indigo-100"
                  >
                    <Calculator size={14}/> 손해배상금 산출
                  </button>
                </div>
              </div>
              <button onClick={()=>setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={24}/></button>
            </div>
            
            <div className="flex flex-col lg:flex-row h-[75vh]">
              <div className="flex-1 p-10 space-y-10 overflow-y-auto custom-scrollbar border-r border-slate-50 bg-white">
                {/* 1. 기본 및 사고 */}
                <section className="space-y-5">
                  <div className="flex items-center gap-2 border-l-4 border-indigo-600 pl-4"><h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">기본 및 사고 정보</h4></div>
                  <div className="grid grid-cols-3 gap-5">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">접수일자</label><input type="date" className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={editingCase?.receptionDate || ''} onChange={e=>setEditingCase(prev=>({...prev, receptionDate: e.target.value}))}/></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">계약자 / 의뢰인</label><div className="flex gap-2">
                      <input type="text" placeholder="계약자" className="w-1/2 bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={editingCase?.contractor || ''} onChange={e=>setEditingCase(prev=>({...prev, contractor: e.target.value}))}/>
                      <input type="text" placeholder="의뢰인" className="w-1/2 bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={editingCase?.clientName || ''} onChange={e=>setEditingCase(prev=>({...prev, clientName: e.target.value}))}/>
                    </div></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">사고 / 진단일자</label><input type="date" className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={editingCase?.incidentDiagnosisDate || ''} onChange={e=>setEditingCase(prev=>({...prev, incidentDiagnosisDate: e.target.value}))}/></div>
                    
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">생년월일</label><input type="date" className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={editingCase?.birthDate || ''} onChange={e=>setEditingCase(prev=>({...prev, birthDate: e.target.value}))}/></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">주민등록번호</label><input type="text" placeholder="주민등록번호" className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={editingCase?.residentNo || ''} onChange={e=>setEditingCase(prev=>({...prev, residentNo: e.target.value}))}/></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">직업</label><input type="text" placeholder="직업" className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={editingCase?.occupation || ''} onChange={e=>setEditingCase(prev=>({...prev, occupation: e.target.value}))}/></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">치료병원</label><input type="text" placeholder="치료병원" className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={editingCase?.treatmentHospital || ''} onChange={e=>setEditingCase(prev=>({...prev, treatmentHospital: e.target.value}))}/></div>

                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">상해급수</label><input type="text" placeholder="상해급수" className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={editingCase?.injuryGrade || ''} onChange={e=>setEditingCase(prev=>({...prev, injuryGrade: e.target.value}))}/></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">초진주수 (주)</label><input type="number" placeholder="주수" className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={editingCase?.initialWeeks || ''} onChange={e=>setEditingCase(prev=>({...prev, initialWeeks: e.target.value}))}/></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">장해등급</label><input type="text" placeholder="장해등급" className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={editingCase?.disabilityGrade || ''} onChange={e=>setEditingCase(prev=>({...prev, disabilityGrade: e.target.value}))}/></div>
                  </div>
                  {/* 진단명 (+) */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">진단명 추가</label>
                    <div className="flex gap-2 mb-3">
                      <input type="text" placeholder="진단명 입력 후 [+] 버튼" className="flex-1 bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={diagInput} onChange={e=>setDiagInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addDiagnosis()}/>
                      <button type="button" onClick={addDiagnosis} className="px-6 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-indigo-700 transition-all flex items-center gap-2"><PlusSquare size={16}/> 추가</button>
                    </div>
                    <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 min-h-[60px]">
                      {(editingCase?.diagnoses || []).map((d, i) => (
                        <div key={i} className="flex items-center gap-2 px-4 py-2 bg-white border border-indigo-100 text-indigo-700 text-xs font-black rounded-xl shadow-sm">
                          {d} <button type="button" onClick={()=>removeDiagnosis(i)} className="text-slate-300 hover:text-red-500"><MinusCircle size={14}/></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <input type="text" placeholder="연락처" className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={editingCase?.phone || ''} onChange={e=>setEditingCase(prev=>({...prev, phone: e.target.value}))}/>
                    <div className="flex gap-2">
                        <input type="text" placeholder="상세 주소" value={editingCase?.address || ''} readOnly className="flex-1 bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm" />
                        <button type="button" onClick={() => handleOpenAddr(addr => setEditingCase(prev=>({...prev, address: addr})))} className="px-6 bg-slate-900 text-white rounded-2xl text-[10px] font-black hover:bg-black flex items-center gap-2"><MapIcon size={14}/> FIND</button>
                    </div>
                  </div>

                  {/* 첨부 파일 섹션 */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">첨부 서류 (진단서, 보험증권, 결과지 등)</label>
                    <div className="flex items-center justify-center w-full">
                      <label
                        className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-[2rem] cursor-pointer transition-all ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'} ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
                        onDragOver={(e) => { if (!isUploading) { e.preventDefault(); setIsDragging(true); } }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => !isUploading && handleDrop(e)}
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {isUploading ? (
                            <Loader2 className="w-8 h-8 mb-3 text-indigo-500 animate-spin" />
                          ) : (
                            <CloudUpload className={`w-8 h-8 mb-3 ${isDragging ? 'text-indigo-500' : 'text-slate-400'}`} />
                          )}
                          <p className="mb-2 text-xs text-slate-500 font-bold">{isUploading ? '파일 업로드 중...' : '클릭하거나 파일을 드래그하여 업로드'}</p>
                          <p className="text-[10px] text-slate-400">JPG, PNG, PDF, HWP (최대 10MB)</p>
                        </div>
                        <input type="file" className="hidden" multiple onChange={handleFileUpload} accept="image/*,.pdf,.hwp,.hwpx" disabled={isUploading} />
                      </label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                      {(editingCase?.attachments || []).map((file, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm group">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <Paperclip size={14} className="text-indigo-500 shrink-0" />
                            <span className="text-xs font-bold text-slate-600 truncate">{file.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"><ExternalLink size={14} /></a>
                            <button type="button" onClick={() => setEditingCase(prev => ({ ...prev, attachments: prev.attachments.filter((_, idx) => idx !== i) }))} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* 2. 보험 상세 (다중 지원) */}
                {(editingCase?.insurances || []).map((ins, idx) => (
                  <section key={idx} className="space-y-5 pt-5 border-t border-slate-100 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 border-l-4 border-emerald-500 pl-4"><h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">보험 상세 정보 #{idx + 1}</h4></div>
                      {idx > 0 && <button onClick={()=>setEditingCase(prev=>{
                        const newInsurances = prev.insurances.filter((_, i)=>i!==idx);
                        const total = newInsurances.reduce((acc, ins) => acc + (ins.coverageDetails || []).reduce((s, d) => s + (Number(d.amount) || 0), 0), 0);
                        return {...prev, insurances: newInsurances, payoutAmount: total};
                      })} className="text-red-500 text-xs font-black hover:underline">삭제</button>}
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">보험종목 / 보험사명</label>
                        <div className="flex gap-2">
                          <select className="w-1/3 bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl font-bold text-sm outline-none" value={ins.insuranceType || '자동차보험'} onChange={e=>{const val=e.target.value; setEditingCase(prev=>{const newArr=[...prev.insurances]; newArr[idx]={...newArr[idx], insuranceType: val}; return {...prev, insurances: newArr};})}}>
                            <option>자동차보험</option><option>배상책임</option><option>실손보험</option>
                            <option>장기보험(질병)</option><option>장기보험(상해)</option>
                            <option>선임권(배책)</option><option>선임권(실손)</option>
                          </select>
                          <input type="text" placeholder="보험사명" className="w-2/3 bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={ins.insuranceCompany || ''} onChange={e=>{const val=e.target.value; setEditingCase(prev=>{const newArr=[...prev.insurances]; newArr[idx]={...newArr[idx], insuranceCompany: val}; return {...prev, insurances: newArr};})}}/>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">접수번호 / 증권번호</label>
                        <div className="flex gap-2">
                          <input type="text" placeholder="접수번호" className="w-1/2 bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={ins.claimNumber || ''} onChange={e=>{const val=e.target.value; setEditingCase(prev=>{const newArr=[...prev.insurances]; newArr[idx]={...newArr[idx], claimNumber: val}; return {...prev, insurances: newArr};})}}/>
                          <input type="text" placeholder="증권번호" className="w-1/2 bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={ins.policyNumber || ''} onChange={e=>{const val=e.target.value; setEditingCase(prev=>{const newArr=[...prev.insurances]; newArr[idx]={...newArr[idx], policyNumber: val}; return {...prev, insurances: newArr};})}}/>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                      <input type="text" placeholder="상품명" className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={ins.productName || ''} onChange={e=>{const val=e.target.value; setEditingCase(prev=>{const newArr=[...prev.insurances]; newArr[idx]={...newArr[idx], productName: val}; return {...prev, insurances: newArr};})}}/>
                      <input type="text" placeholder="담보명" className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={ins.coverageName || ''} onChange={e=>{const val=e.target.value; setEditingCase(prev=>{const newArr=[...prev.insurances]; newArr[idx]={...newArr[idx], coverageName: val}; return {...prev, insurances: newArr};})}}/>
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                      <input type="text" placeholder="심사자 성함 / 연락처" className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={ins.reviewerInfo || ''} onChange={e=>{const val=e.target.value; setEditingCase(prev=>{const newArr=[...prev.insurances]; newArr[idx]={...newArr[idx], reviewerInfo: val}; return {...prev, insurances: newArr};})}}/>
                      <input type="text" placeholder="조사자 성함 / 연락처" className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={ins.investigatorInfo || ''} onChange={e=>{const val=e.target.value; setEditingCase(prev=>{const newArr=[...prev.insurances]; newArr[idx]={...newArr[idx], investigatorInfo: val}; return {...prev, insurances: newArr};})}}/>
                    </div>
                    <div className="space-y-3 pt-2 border-t border-dashed border-slate-200">
                        <div className="flex items-center gap-2"><h5 className="text-xs font-black text-slate-500 uppercase tracking-tight">담보별 예상 지급액</h5></div>
                        <div className="flex gap-2">
                            <input type="text" id={`covName-${idx}`} placeholder="담보명" className="flex-1 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl font-bold text-xs outline-none" />
                            <input type="text" id={`covAmt-${idx}`} placeholder="금액" className="w-1/3 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl font-bold text-xs outline-none" onKeyUp={(e) => e.target.value = formatComma(unformatComma(e.target.value))} />
                            <button type="button" onClick={()=>{
                                const nameInput = document.getElementById(`covName-${idx}`);
                                const amtInput = document.getElementById(`covAmt-${idx}`);
                                const name = nameInput.value;
                                const amt = unformatComma(amtInput.value);
                                if(!name) return;
                                setEditingCase(prev => {
                                    const newInsurances = [...(prev.insurances || [])];
                                    newInsurances[idx] = { ...newInsurances[idx], coverageDetails: [...(newInsurances[idx].coverageDetails || []), { name, amount: amt }] };
                                    const total = newInsurances.reduce((acc, ins) => acc + (ins.coverageDetails || []).reduce((s, d) => s + (Number(d.amount) || 0), 0), 0);
                                    return { ...prev, insurances: newInsurances, payoutAmount: total };
                                });
                                nameInput.value='';
                                amtInput.value='';
                            }} className="px-4 bg-slate-800 text-white rounded-xl font-black text-[10px] hover:bg-black transition-all">추가</button>
                        </div>
                        <div className="space-y-1">
                            {(ins.coverageDetails || []).map((item, cIdx) => (
                            <div key={cIdx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="font-bold text-xs text-slate-700">{item.name}</span>
                                <div className="flex items-center gap-3">
                                <span className="font-mono font-black text-xs text-indigo-600">₩{formatComma(item.amount)}</span>
                                <button type="button" onClick={()=>setEditingCase(prev => {
                                    const newInsurances = [...(prev.insurances || [])];
                                    newInsurances[idx] = { ...newInsurances[idx], coverageDetails: newInsurances[idx].coverageDetails.filter((_, i) => i !== cIdx) };
                                    const total = newInsurances.reduce((acc, ins) => acc + (ins.coverageDetails || []).reduce((s, d) => s + (Number(d.amount) || 0), 0), 0);
                                    return { ...prev, insurances: newInsurances, payoutAmount: total };
                                })} className="text-slate-300 hover:text-red-500"><Trash2 size={12}/></button>
                                </div>
                            </div>
                            ))}
                        </div>
                    </div>
                  </section>
                ))}
                <button type="button" onClick={()=>setEditingCase(prev=>({...prev, insurances: [...(prev.insurances||[]), {insuranceType: '자동차보험'}]}))} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-xs hover:border-indigo-500 hover:text-indigo-500 transition-all flex items-center justify-center gap-2"><Plus size={16}/> 보험사 추가</button>

                {/* 3. 금액 산정 */}
                <section className="space-y-5 pt-5 border-t border-slate-100">
                  <div className="flex items-center gap-2 border-l-4 border-rose-500 pl-4"><h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">금액 산정 정보</h4></div>
                  <div className="grid grid-cols-3 gap-5">
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase px-2 tracking-widest">예상 지급액 (₩)</label><input type="text" className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-mono font-black text-sm text-emerald-600 outline-none" value={formatComma(editingCase?.payoutAmount || 0)} onChange={e=>setEditingCase(prev=>({...prev, payoutAmount: unformatComma(e.target.value)}))}/></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase px-2 tracking-widest">예상 장해율 (%)</label><input type="number" className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-mono font-black text-sm outline-none" value={editingCase?.disabilityRate || 0} onChange={e=>setEditingCase(prev=>({...prev, disabilityRate: Number(e.target.value)}))}/></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase px-2 tracking-widest">예상 수수료 (₩)</label><input type="text" className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-mono font-black text-sm text-indigo-600 outline-none" value={formatComma(editingCase?.amount || 0)} onChange={e=>setEditingCase(prev=>({...prev, amount: unformatComma(e.target.value)}))}/></div>
                  </div>
                </section>

                {/* 4. 상태 설정 */}
                <section className="space-y-5 pt-5 border-t border-slate-100">
                  <div className="flex gap-4">
                    {['미결', '종결'].map(s => <button key={s} type="button" onClick={()=>setEditingCase(prev=>({...prev, status: s}))} className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all border-2 ${editingCase?.status===s || (s==='미결' && editingCase?.status!=='종결') ?'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-105':'bg-white border-slate-100 text-slate-400'}`}>{s} 처리</button>)}
                  </div>
                </section>

                {/* 5. 의뢰인 일정 관리 (New) */}
                <section className="space-y-5 pt-5 border-t border-slate-100">
                  <div className="flex items-center gap-2 border-l-4 border-blue-500 pl-4"><h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">의뢰인 일정 관리 (구글 캘린더)</h4></div>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">일정 날짜 / 시간</label>
                      <div className="flex gap-2">
                        <input type="date" className="w-1/2 bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={editingCase?.scheduleDate || ''} onChange={e=>setEditingCase(prev=>({...prev, scheduleDate: e.target.value}))}/>
                        <input type="time" className="w-1/2 bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={editingCase?.scheduleTime || ''} onChange={e=>setEditingCase(prev=>({...prev, scheduleTime: e.target.value}))}/>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">일정 제목</label>
                      <input type="text" placeholder="예: 의뢰인 미팅" className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={editingCase?.scheduleTitle || ''} onChange={e=>setEditingCase(prev=>({...prev, scheduleTitle: e.target.value}))}/>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">일정 내용</label>
                    <div className="flex gap-2">
                        <input type="text" placeholder="상세 내용" className="flex-1 bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={editingCase?.scheduleDesc || ''} onChange={e=>setEditingCase(prev=>({...prev, scheduleDesc: e.target.value}))}/>
                        <button type="button" onClick={() => {
                            if (!editingCase?.scheduleDate || !editingCase?.scheduleTime) return alert("날짜와 시간을 입력해주세요.");
                            if (googleToken) {
                              saveToGoogleCalendarAPI(editingCase);
                            } else {
                              // 기존 방식 (Fallback)
                              const { scheduleDate, scheduleTime, scheduleTitle, scheduleDesc, address } = editingCase;
                              const start = new Date(`${scheduleDate}T${scheduleTime}`);
                              const end = new Date(start.getTime() + 60 * 60 * 1000);
                              const pad = n => n.toString().padStart(2, '0');
                              const fmt = d => `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
                              const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(scheduleTitle || '의뢰인 미팅')}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(scheduleDesc || '')}&location=${encodeURIComponent(address || '')}`;
                              window.open(url, '_blank');
                            }

                            // 기록 관리 연동: 일정 등록 시 로그 자동 추가
                            const logContent = `[일정 등록] ${editingCase.scheduleDate} ${editingCase.scheduleTime}\n제목: ${editingCase.scheduleTitle || '의뢰인 미팅'}\n내용: ${editingCase.scheduleDesc || '-'}`;
                            setEditingCase(prev => ({ ...prev, logs: [{ id: Date.now(), date: new Date().toISOString().split('T')[0], content: logContent }, ...(prev.logs || [])] }));
                        }} className="px-6 bg-blue-600 text-white rounded-2xl font-black text-xs hover:bg-blue-700 transition-all flex items-center gap-2">
                            <Calendar size={16}/> 캘린더 등록
                        </button>
                    </div>
                  </div>
                </section>
              </div>

              {/* 타임라인 */}
              <div className="lg:w-[400px] bg-slate-50/50 p-10 shrink-0 flex flex-col h-full">
                <div className="flex items-center gap-2 mb-8"><History size={22} className="text-indigo-600"/><h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">기록 관리</h4></div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-8 space-y-4">
                   <input type="date" className="w-full text-[11px] font-black text-slate-400 border-none p-0 outline-none" defaultValue={new Date().toISOString().split('T')[0]} id="logDate"/>
                   <textarea id="logText" placeholder="내용 입력..." className="w-full h-32 text-xs font-bold border-none p-0 outline-none resize-none custom-scrollbar placeholder:text-slate-200"/>
                   <button type="button" onClick={()=>{const content=document.getElementById('logText').value; if(!content)return; const newLog={id:Date.now(), date:document.getElementById('logDate').value, content}; setEditingCase(prev=>({...prev, logs: [newLog, ...(prev.logs||[])]})); document.getElementById('logText').value='';}} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 font-mono"><PlusCircle size={16}/> RECORD</button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-3">
                  {editingCase?.logs?.length > 0 ? editingCase.logs.map((log) => (
                    <div key={log.id} className="relative pl-6 border-l-2 border-indigo-100 group animate-in slide-in-from-right-4 duration-300">
                      <div className="absolute left-[-5px] top-1 w-2 h-2 bg-indigo-500 rounded-full"></div>
                      <div className="flex justify-between items-start mb-1"><span className="text-[10px] font-black text-indigo-300 italic">{log.date}</span><button onClick={()=>setEditingCase(prev=>({...prev, logs: prev.logs.filter(l=>l.id!==log.id)}))} className="text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button></div>
                      <p className="text-[11px] text-slate-600 font-bold leading-relaxed whitespace-pre-wrap">{log.content}</p>
                    </div>
                  )) : <div className="h-full flex flex-col items-center justify-center opacity-30 gap-3 grayscale"><FileText size={48}/><p className="text-[10px] font-black uppercase tracking-widest">No Logs</p></div>}
                </div>
              </div>
            </div>

            <div className="p-8 bg-white border-t flex gap-5">
              <button onClick={()=>setIsModalOpen(false)} className="flex-1 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] font-black text-slate-500 hover:bg-slate-100 transition-all font-mono">CLOSE</button>
              <button onClick={()=>handleSaveCase(editingCase)} className="flex-[2] py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl hover:bg-indigo-700 transition-all scale-100 hover:scale-[1.01] flex items-center justify-center gap-3">
                <Save size={20}/> 모든 정보 최종 업데이트 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 상담일지 등록/수정 모달 */}
      {isConsultationModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 z-[100] font-sans">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="px-10 py-6 border-b flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 tracking-tighter italic">상담일지 작성</h3>
              <button onClick={()=>setIsConsultationModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={24}/></button>
            </div>
            <div className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">상담일자</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={editingConsultation?.date || ''} onChange={e=>setEditingConsultation({...editingConsultation, date: e.target.value})}/>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">상태</label>
                  <select className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={editingConsultation?.status || '상담중'} onChange={e=>setEditingConsultation({...editingConsultation, status: e.target.value})}>
                    <option>상담중</option>
                    <option>상담완료</option>
                    <option>사건전환</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">고객명</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={editingConsultation?.clientName || ''} onChange={e=>setEditingConsultation({...editingConsultation, clientName: e.target.value})}/>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">연락처</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={editingConsultation?.phone || ''} onChange={e=>setEditingConsultation({...editingConsultation, phone: e.target.value})}/>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">상담 내용</label>
                <textarea rows={6} className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none resize-none" value={editingConsultation?.content || ''} onChange={e=>setEditingConsultation({...editingConsultation, content: e.target.value})}/>
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={()=>setIsConsultationModalOpen(false)} className="flex-1 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-500 hover:bg-slate-100 transition-all">취소</button>
                <button onClick={()=>handleSaveConsultation(editingConsultation)} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all">상담 내용 저장</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 계산기 모달 */}
      {activeCalcField && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-slate-800">{assessmentLabels[activeCalcField]} 상세 산출</h3>
              <button onClick={() => setActiveCalcField(null)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <input type="text" id="calcItemName" placeholder="항목명" className="flex-1 border p-2 rounded text-sm" onKeyDown={e => e.key === 'Enter' && document.getElementById('calcAddBtn').click()} />
                <input type="text" id="calcItemAmount" placeholder="금액" className="w-24 border p-2 rounded text-sm text-right" onKeyUp={(e) => e.target.value = formatComma(unformatComma(e.target.value))} onKeyDown={e => e.key === 'Enter' && document.getElementById('calcAddBtn').click()} />
                <button id="calcAddBtn" onClick={() => {
                  const name = document.getElementById('calcItemName').value;
                  const amount = unformatComma(document.getElementById('calcItemAmount').value);
                  if (!name) return;
                  const currentItems = reportData.assessmentDetails?.[activeCalcField] || [];
                  const newItems = [...currentItems, { id: Date.now(), name, amount }];
                  const total = newItems.reduce((sum, item) => sum + item.amount, 0);
                  setReportData(prev => ({
                    ...prev,
                    assessment: { ...prev.assessment, [activeCalcField]: total },
                    assessmentDetails: { ...prev.assessmentDetails, [activeCalcField]: newItems }
                  }));
                  document.getElementById('calcItemName').value = '';
                  document.getElementById('calcItemAmount').value = '';
                  document.getElementById('calcItemName').focus();
                }} className="bg-blue-600 text-white px-3 rounded text-sm font-bold hover:bg-blue-700">추가</button>
              </div>
              <div className="max-h-60 overflow-y-auto border rounded divide-y">
                {(reportData.assessmentDetails?.[activeCalcField] || []).map((item) => (
                  <div key={item.id} className="flex justify-between p-2 text-sm">
                    <span>{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">₩{item.amount.toLocaleString()}</span>
                      <button onClick={() => {
                        const newItems = reportData.assessmentDetails[activeCalcField].filter(i => i.id !== item.id);
                        const total = newItems.reduce((sum, i) => sum + i.amount, 0);
                        setReportData(prev => ({
                          ...prev,
                          assessment: { ...prev.assessment, [activeCalcField]: total },
                          assessmentDetails: { ...prev.assessmentDetails, [activeCalcField]: newItems }
                        }));
                      }} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))}
                {(reportData.assessmentDetails?.[activeCalcField] || []).length === 0 && <div className="p-4 text-center text-slate-400 text-xs">항목이 없습니다.</div>}
              </div>
              <div className="flex justify-between items-center pt-2 border-t font-bold">
                <span>합계</span>
                <span className="text-blue-600 text-lg">₩{(reportData.assessment[activeCalcField] || 0).toLocaleString()}</span>
              </div>
              <button onClick={() => setActiveCalcField(null)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-colors">확인</button>
            </div>
          </div>
        </div>
      )}

      {/* 주소 검색 모달 (메인 화면용) */}
      {isAddrOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <span className="font-black text-sm text-slate-800">주소 찾기</span>
              <button onClick={()=>setIsAddrOpen(false)} className="p-2 hover:text-red-500"><X size={20}/></button>
            </div>
            <div id="addr-layer" className="w-full h-[500px]"></div>
          </div>
        </div>
      )}

      {/* 퀵 일정 추가 모달 */}
      {isQuickModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70] font-sans">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">빠른 일정 추가</h3>
              <button onClick={() => setIsQuickModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={20}/></button>
            </div>
            <div className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest">일정 제목</label>
                <input type="text" placeholder="예: 의뢰인 미팅" className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={quickEvent.scheduleTitle} onChange={e => setQuickEvent({...quickEvent, scheduleTitle: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest">날짜</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={quickEvent.scheduleDate} onChange={e => setQuickEvent({...quickEvent, scheduleDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest">시간</label>
                  <input type="time" className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none" value={quickEvent.scheduleTime} onChange={e => setQuickEvent({...quickEvent, scheduleTime: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest">상세 내용</label>
                <textarea placeholder="일정 상세 내용을 입력하세요..." rows={3} className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none" value={quickEvent.scheduleDesc} onChange={e => setQuickEvent({...quickEvent, scheduleDesc: e.target.value})} />
              </div>
              <button 
                onClick={async () => {
                  if (!quickEvent.scheduleTitle) return alert("제목을 입력해주세요.");
                  await saveToGoogleCalendarAPI(quickEvent);
                  setIsQuickModalOpen(false);
                  setQuickEvent({
                    scheduleTitle: '',
                    scheduleDate: new Date().toISOString().split('T')[0],
                    scheduleTime: new Date().toTimeString().slice(0, 5),
                    scheduleDesc: ''
                  });
                }}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-700 transition-all"
              >
                캘린더에 즉시 등록
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          aside, header, .print\\:hidden { display: none !important; }
          main { overflow: visible !important; height: auto !important; }
          .print\\:p-0 { padding: 0 !important; }
          #print-area, #calc-print-area { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; z-index: 9999; font-variant-numeric: tabular-nums; }
          .page-break { page-break-before: always; height: 1px; }
        }
        #print-area {
          font-family: 'GulimChe', '굴림체', 'Gulim', '굴림', sans-serif !important;
        }
        #print-area [contenteditable="true"]:hover {
          background-color: #f8fafc;
          cursor: text;
        }
        #print-area [contenteditable="true"]:focus {
          background-color: #f1f5f9;
          outline: none;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;