import React, { useRef, useState } from 'react';
import { FieldTaskItem, FieldTaskSubmission } from '../../types/contracts';
import { useGeolocation } from '../../hooks/useGeolocation';
import { calculateSha256, readPhotoAsDataUrl, validateEvidencePhoto } from '../../utils/photoHasher';
import { assessmentProgress } from '../../utils/assessmentProgress';
import { 
  Camera, 
  MapPin, 
  Hash, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  CreditCard, 
  Bike, 
  Home, 
  FileText, 
  Save, 
  ChevronLeft, 
  ChevronRight,
  UploadCloud,
  Check,
  RefreshCw
} from 'lucide-react';

interface Screen8FieldAssessmentFormProps {
  task: FieldTaskItem;
  onBackToTasks: () => void;
  onSubmitVerification: (submission: FieldTaskSubmission) => void | Promise<void>;
  showSpecAnnotations?: boolean;
}

export const Screen8FieldAssessmentForm: React.FC<Screen8FieldAssessmentFormProps> = ({
  task,
  onBackToTasks,
  onSubmitVerification,
  showSpecAnnotations = false,
}) => {
  const [currentStep, setCurrentStep] = useState(1);

  // Section 1: Living Conditions
  const [wallConstruction, setWallConstruction] = useState<1 | 2 | 3 | null>(null);
  const [roofConstruction, setRoofConstruction] = useState<1 | 2 | 3 | null>(null);
  const [waterAccess, setWaterAccess] = useState<1 | 2 | 3 | null>(null);

  // 2. Vehicles and work assets (The Motorcycle Check)
  const [isMotorcyclePresent, setIsMotorcyclePresent] = useState<boolean | null>(null);
  const [isProductiveAsset, setIsProductiveAsset] = useState<boolean | null>(null);
  const [proofType, setProofType] = useState<
    'MOVEIT' | 'ANGKAS' | 'TRICYCLE_MTOP' | 'DELIVERY_LOGISTICS' | 'PERSONAL_ONLY' | ''
  >('');
  const [franchiseNumber, setFranchiseNumber] = useState('');

  // 3. The 4Ps cash card
  const [physicalCardPresented, setPhysicalCardPresented] = useState<boolean | null>(null);
  const [cardMatchesBeneficiary, setCardMatchesBeneficiary] = useState<boolean | null>(null);
  const [pawningSuspected, setPawningSuspected] = useState<boolean | null>(null);

  // 4. Photo of the house
  const [photoCaptured, setPhotoCaptured] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [clientSideHash, setClientSideHash] = useState('');
  const [capturedAt, setCapturedAt] = useState('');
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { position: gpsData, error: gpsError, isLocating, capturePosition } = useGeolocation();

  // Section 5: Final Recommendation & Narrative
  const [workerRecommendation, setWorkerRecommendation] = useState<
    'RETAIN' | 'RECOMMEND_GRADUATION' | 'INVESTIGATE_FRAUD' | ''
  >('');
  const [narrativeReport, setNarrativeReport] = useState('');
  // field-task-submission.json requires the worker-verified SWDI level.
  const [verifiedSwdiLevel, setVerifiedSwdiLevel] = useState<1 | 2 | 3 | ''>('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const completedSteps = assessmentProgress({
    wall: wallConstruction, roof: roofConstruction, water: waterAccess,
    motorcycle: isMotorcyclePresent, productive: isProductiveAsset, proof: proofType,
    cardPresented: physicalCardPresented, cardMatches: cardMatchesBeneficiary, pawning: pawningSuspected,
    evidenceReady: !isProcessingPhoto && photoCaptured && Boolean(gpsData) && Boolean(clientSideHash),
    recommendation: verifiedSwdiLevel ? workerRecommendation : '', narrative: narrativeReport,
  });

  const handleCapturePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const input = event.target;
    setIsProcessingPhoto(true);
    setCaptureError(null);
    setPhotoCaptured(false);
    setPhotoDataUrl(null);
    setClientSideHash('');
    setCapturedAt('');
    try {
      await validateEvidencePhoto(file);
      const [hash, dataUrl] = await Promise.all([calculateSha256(file), readPhotoAsDataUrl(file)]);
      await new Promise<void>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('This photo could not be opened. Choose another image.'));
        image.src = dataUrl;
      });
      await capturePosition();
      setClientSideHash(hash);
      setPhotoDataUrl(dataUrl);
      setPhotoCaptured(true);
      setCapturedAt(new Date().toISOString());
    } catch (reason) {
      setPhotoCaptured(false);
      setCaptureError(reason instanceof Error ? reason.message : 'Unable to capture geotagged evidence.');
    } finally {
      setIsProcessingPhoto(false);
      input.value = '';
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || !completedSteps.every(Boolean) || wallConstruction === null || roofConstruction === null || waterAccess === null || isMotorcyclePresent === null || physicalCardPresented === null || cardMatchesBeneficiary === null || pawningSuspected === null || !workerRecommendation || !verifiedSwdiLevel || !gpsData) return;
    setIsSaving(true);
    setSaveError(null);

    const submission: FieldTaskSubmission = {
      task_id: task.task_id,
      household_id: task.household_id,
      timestamp: new Date().toISOString(),
      wall_construction: wallConstruction,
      roof_construction: roofConstruction,
      water_access: waterAccess,
      is_motorcycle_present: isMotorcyclePresent,
      is_productive_asset: isMotorcyclePresent ? isProductiveAsset === true : false,
      proof_type: isMotorcyclePresent && proofType ? proofType : undefined,
      franchise_number: isMotorcyclePresent ? franchiseNumber : undefined,
      physical_card_presented: physicalCardPresented,
      card_matches_beneficiary: cardMatchesBeneficiary,
      pawning_suspected: pawningSuspected,
      evidence_attachments: photoCaptured
        ? [
            {
              photo_url: photoDataUrl ?? '',
              captured_at: capturedAt,
              gps_readout: gpsData!,
              client_side_hash: clientSideHash
            }
          ]
        : [],
      verified_swdi_level: verifiedSwdiLevel,
      worker_recommendation: workerRecommendation,
      narrative_report: narrativeReport,
      sync_status: 'PENDING_SYNC'
    };

    try {
      await onSubmitVerification(submission);
    } catch {
      setSaveError('The report could not be saved on this device. Your answers are still here; please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const steps = [
    { num: 1, title: 'Living conditions', icon: Home },
    { num: 2, title: 'Assets', icon: Bike },
    { num: 3, title: 'Cash card', icon: CreditCard },
    { num: 4, title: 'Photo', icon: Camera },
    { num: 5, title: 'Recommendation', icon: FileText }
  ];

  return (
    <div className="module-page assessment-page">
      
      {/* Back button & Screen Spec */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToTasks}
          disabled={isSaving}
          className="min-h-[38px] px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-lg flex items-center space-x-1.5 shadow-xs cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to visits</span>
        </button>

        <div className="text-right">
          <span className="text-[11px] text-slate-500 block tabular-nums">
            {task.household_id}
          </span>
          <span className="text-xs font-bold text-slate-800">
            {task.head_of_household.first_name} {task.head_of_household.last_name}
          </span>
        </div>
      </div>

      {showSpecAnnotations && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-[10px] font-mono text-slate-600">
          <div>SCREEN 8: Step-by-Step Field Assessment Form</div>
          <div>POST /api/v1/tasks/:id/submit | IndexedDB Offline Fallback</div>
        </div>
      )}

      {/* 5-Step Visual Stepper Bar */}
      <div className="assessment-stepper">
        <div className="flex items-center justify-between">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isCompleted = completedSteps[s.num - 1];
            const isCurrent = currentStep === s.num;

            return (
              <button
                key={s.num}
                aria-label={`Step ${s.num}: ${s.title}`}
                aria-current={isCurrent ? 'step' : undefined}
                data-complete={isCompleted}
                title={isCompleted ? 'Complete' : 'Incomplete'}
                disabled={isSaving}
                onClick={() => setCurrentStep(s.num)}
                className="flex-1 flex flex-col items-center group py-1 cursor-pointer"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition ${
                  isCurrent
                    ? 'bg-blue-700 text-white shadow-xs'
                    : isCompleted
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}>
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <span className={`text-[10px] mt-1 text-center font-medium hidden sm:inline ${
                  isCurrent ? 'text-blue-900 font-semibold' : 'text-slate-500'
                }`}>
                  {s.title}
                </span>
              </button>
            );
          })}
        </div>
        <p className="assessment-step-caption" aria-live="polite">{currentStep}. {steps.find((step) => step.num === currentStep)?.title}</p>
      </div>

      {/* Form Content Card */}
      <div className="assessment-content">
        
        {/* SECTION 1: Living Conditions (SWDI Physical Scoring) */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center space-x-2 text-blue-900">
                <Home className="w-4 h-4 text-blue-700" />
                <h3 className="text-base font-bold text-slate-900">
                  1. The house
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Check the walls, roof and water source. These follow the DSWD SWDI criteria.
              </p>
            </div>

            {/* Wall Construction */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Wall Construction Material
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: 1, label: 'Light (1)', sub: 'Bamboo / Sawali' },
                  { val: 2, label: 'Mixed (2)', sub: 'Wood & Half-Concrete' },
                  { val: 3, label: 'Concrete (3)', sub: 'Solid Masonry' }
                ].map((opt) => (
                  <button
                    key={opt.val}
                    aria-pressed={wallConstruction === opt.val}
                    type="button"
                    onClick={() => setWallConstruction(opt.val as 1 | 2 | 3)}
                    className={`min-h-[46px] p-2 rounded-lg border text-center transition cursor-pointer ${
                      wallConstruction === opt.val
                        ? 'bg-blue-50 text-blue-900 border-blue-400 font-semibold shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div className="text-[10px] opacity-75">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Roof Construction */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Roof Construction Material
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: 1, label: 'Makeshift (1)', sub: 'Tarpaulin / Scrap' },
                  { val: 2, label: 'Mixed (2)', sub: 'Reused Corrugated' },
                  { val: 3, label: 'Galvanized (3)', sub: 'Standard G.I. Sheet' }
                ].map((opt) => (
                  <button
                    key={opt.val}
                    aria-pressed={roofConstruction === opt.val}
                    type="button"
                    onClick={() => setRoofConstruction(opt.val as 1 | 2 | 3)}
                    className={`min-h-[46px] p-2 rounded-lg border text-center transition cursor-pointer ${
                      roofConstruction === opt.val
                        ? 'bg-blue-50 text-blue-900 border-blue-400 font-semibold shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div className="text-[10px] opacity-75">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Water Access */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Water Access Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: 1, label: 'Point Source (1)', sub: 'Deep Well / Spring' },
                  { val: 2, label: 'Communal (2)', sub: 'Barangay Faucet' },
                  { val: 3, label: 'Metered (3)', sub: 'Piped Direct Utility' }
                ].map((opt) => (
                  <button
                    key={opt.val}
                    aria-pressed={waterAccess === opt.val}
                    type="button"
                    onClick={() => setWaterAccess(opt.val as 1 | 2 | 3)}
                    className={`min-h-[46px] p-2 rounded-lg border text-center transition cursor-pointer ${
                      waterAccess === opt.val
                        ? 'bg-blue-50 text-blue-900 border-blue-400 font-semibold shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div className="text-[10px] opacity-75">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: Livelihood Asset Verification (The Motorcycle Check) */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center space-x-2 text-blue-900">
                <Bike className="w-4 h-4 text-blue-700" />
                <h3 className="text-base font-bold text-slate-900">
                  2. Vehicles and work assets
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Distinguishes between luxury consumer assets vs. active livelihood tools.
              </p>
            </div>

            {/* Toggle: is_motorcycle_present (Yes/No) */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-2">
              <label className="block text-xs font-semibold text-slate-800">
                Is a motorcycle physically present at the residence?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  aria-pressed={isMotorcyclePresent === true}
                  onClick={() => setIsMotorcyclePresent(true)}
                  className={`min-h-[44px] rounded-lg font-semibold text-xs border transition cursor-pointer ${
                    isMotorcyclePresent === true
                      ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Yes, Present
                </button>
                <button
                  type="button"
                  aria-pressed={isMotorcyclePresent === false}
                  onClick={() => setIsMotorcyclePresent(false)}
                  className={`min-h-[44px] rounded-lg font-semibold text-xs border transition cursor-pointer ${
                    isMotorcyclePresent === false
                      ? 'bg-blue-50 text-blue-900 border-blue-300 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  No, None Found
                </button>
              </div>
            </div>

            {/* If Yes -> Conditional Inputs */}
            {isMotorcyclePresent && (
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/80 space-y-4">
                
                {/* Toggle: is_productive_asset */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Is the vehicle used as a productive asset for daily livelihood?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      aria-pressed={isProductiveAsset === true}
                      onClick={() => setIsProductiveAsset(true)}
                      className={`min-h-[42px] rounded-lg font-semibold text-xs border transition cursor-pointer ${
                        isProductiveAsset === true
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Yes (Productive Livelihood)
                    </button>
                    <button
                      type="button"
                      aria-pressed={isProductiveAsset === false}
                      onClick={() => setIsProductiveAsset(false)}
                      className={`min-h-[42px] rounded-lg font-semibold text-xs border transition cursor-pointer ${
                        isProductiveAsset === false
                          ? 'bg-red-50 text-red-900 border-red-300 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      No (Personal Use Only)
                    </button>
                  </div>
                </div>

                {/* Dropdown proof_type */}
                <div>
                  <label htmlFor="assessment-proof" className="block text-xs font-semibold text-slate-700 mb-1">
                    Livelihood Platform / Verification Proof
                  </label>
                  <select
                    id="assessment-proof"
                    value={proofType}
                    onChange={(e) => setProofType(e.target.value as any)}
                    className="w-full min-h-[40px] px-3 border border-slate-200 rounded-lg text-xs font-medium bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-700"
                  >
                    <option value="" disabled>Select verification proof</option>
                    <option value="MOVEIT">MOVEIT (Ride-Hailing / Delivery)</option>
                    <option value="ANGKAS">ANGKAS (Ride-Hailing / Delivery)</option>
                    <option value="TRICYCLE_MTOP">TRICYCLE_MTOP (Local Municipal Franchise)</option>
                    <option value="DELIVERY_LOGISTICS">DELIVERY_LOGISTICS (Lalamove / Shopee / Lazada)</option>
                    <option value="PERSONAL_ONLY">PERSONAL_ONLY (No commercial income generated)</option>
                  </select>
                </div>

                {/* Input: franchise_number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Franchise Number / Rider Accreditation ID
                  </label>
                  <input
                    type="text"
                    value={franchiseNumber}
                    onChange={(e) => setFranchiseNumber(e.target.value)}
                    placeholder="e.g. MV-2024-88190 or MTOP-CAL-110"
                    className="w-full min-h-[40px] px-3 border border-slate-200 rounded-lg text-xs bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-700"
                  />
                </div>

              </div>
            )}
          </div>
        )}

        {/* SECTION 3: Anti-Loan Shark Check (Sangla-ATM) */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center space-x-2 text-blue-900">
                <CreditCard className="w-4 h-4 text-blue-700" />
                <h3 className="text-base font-bold text-slate-900">
                  3. The 4Ps cash card
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Investigates illegal collateralization of LandBank 4Ps cash cards to predatory loan sharks.
              </p>
            </div>

            <div className="assessment-questions">
              {[
                { id: 'card-presented', label: 'Did the beneficiary present their LandBank 4Ps card?', value: physicalCardPresented, onChange: setPhysicalCardPresented },
                { id: 'card-match', label: 'Does the card name match the PhilSys National ID?', value: cardMatchesBeneficiary, onChange: setCardMatchesBeneficiary },
                { id: 'pawning', label: 'Is there evidence of card pawning (Sangla-ATM)?', value: pawningSuspected, onChange: setPawningSuspected },
              ].map((question) => (
                <fieldset key={question.id} className="assessment-question">
                  <legend>{question.label}</legend>
                  <div className="answer-options">
                    {[true, false].map((answer) => (
                      <label key={String(answer)}>
                        <input type="radio" name={question.id} checked={question.value === answer} onChange={() => question.onChange(answer)} />
                        {answer ? 'Yes' : 'No'}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
              {pawningSuspected === true && <p className="preview-note">Pawning concern recorded for review. No referral has been submitted.</p>}
            </div>
          </div>
        )}

        {/* SECTION 4: Geotagged Camera Capture (The Hardware Hook) */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center space-x-2 text-blue-900">
                <Camera className="w-4 h-4 text-blue-700" />
                <h3 className="text-base font-bold text-slate-900">
                  4. Photo of the house
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Take one clear photo of the house from outside. The phone adds its location and time.
              </p>
            </div>

            {/* In-App Camera Viewport / Photo Preview */}
            <div className="relative bg-slate-900 rounded-xl overflow-hidden border border-slate-700 aspect-video flex items-center justify-center text-white">
              {photoCaptured && photoDataUrl ? (
                <div className="relative w-full h-full bg-slate-800 flex items-center justify-center">
                  <img src={photoDataUrl} alt="Captured field evidence" className="h-full w-full object-contain" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent flex flex-col justify-end p-4">
                    <span className="text-xs text-emerald-300 font-semibold">
                      Photo saved with its location
                    </span>
                    <span className="text-xs font-medium text-white">
                      Field verification evidence
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6">
                  <Camera className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">
                    No photo attached
                  </p>
                </div>
              )}

              {/* Viewfinder crosshairs */}
              <div className="absolute inset-4 border border-white/20 rounded pointer-events-none"></div>
            </div>

            {/* Live Badges: GPS Readout & Client-Side Hash */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Live GPS Readout Badge */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 mb-0.5">
                  <MapPin className="w-3.5 h-3.5 text-red-600" />
                  <span>Location</span>
                </div>
                <div className="text-xs font-semibold text-slate-900 tabular-nums">
                  {photoCaptured && gpsData ? `${gpsData.latitude.toFixed(6)}, ${gpsData.longitude.toFixed(6)}` : 'Waiting for device location'}
                </div>
                <div className="text-[10px] text-emerald-700 mt-0.5">
                  {photoCaptured && gpsData ? `Within ${gpsData.accuracy_m.toFixed(0)} m` : 'Your phone is asked for its location when you take the photo'}
                </div>
              </div>

              {/* Client-Side Hash Badge */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-blue-900 mb-0.5">
                  <Hash className="w-3.5 h-3.5 text-blue-700" />
                  <span>Photo fingerprint</span>
                </div>
                <div className="font-mono text-xs font-medium text-blue-950 truncate">
                  {clientSideHash || 'Waiting for photo'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  SHA-256, made on this phone. Shows the photo was not changed later.
                </div>
              </div>

            </div>

            {/* Capture button */}
            <div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={handleCapturePhoto}
                className="hidden"
              />
              <button
                type="button"
                id="capture-photo-btn"
                onClick={() => photoInputRef.current?.click()}
                disabled={isProcessingPhoto || isLocating}
                className="w-full min-h-[42px] py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg text-xs flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                {isProcessingPhoto || isLocating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 text-amber-300" />}
                <span>{isProcessingPhoto || isLocating ? 'Getting location…' : photoCaptured ? 'Retake photo' : 'Take photo'}</span>
              </button>
              {(captureError || gpsError) && (
                <p className="mt-2 text-xs text-red-700" role="alert">{captureError || gpsError}</p>
              )}
            </div>

          </div>
        )}

        {/* SECTION 5: Final Recommendation & Narrative */}
        {currentStep === 5 && (
          <form onSubmit={handleFinalSubmit} className="space-y-5">
            <div>
              <div className="flex items-center space-x-2 text-blue-900">
                <FileText className="w-4 h-4 text-blue-700" />
                <h3 className="text-base font-bold text-slate-900">
                  5. Your recommendation
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Field findings and recommendation for this household.
              </p>
            </div>

            {/* Select: verified_swdi_level */}
            <div>
              <label htmlFor="verified-swdi-level-select" className="block text-xs font-semibold text-slate-800 mb-1.5">
                Verified SWDI level
              </label>
              <select
                id="verified-swdi-level-select"
                disabled={isSaving}
                value={verifiedSwdiLevel}
                onChange={(e) => setVerifiedSwdiLevel(Number(e.target.value) as 1 | 2 | 3)}
                className="w-full min-h-[42px] px-3 border border-slate-200 rounded-lg text-xs font-medium bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-700"
              >
                <option value="" disabled>Select the level verified on site</option>
                <option value="1">Level 1: Survival</option>
                <option value="2">Level 2: Subsistence</option>
                <option value="3">Level 3: Self-Sufficient</option>
              </select>
            </div>

            {/* Select: worker_recommendation */}
            <div>
              <label htmlFor="worker-recommendation-select" className="block text-xs font-semibold text-slate-800 mb-1.5">
                Recommendation
              </label>
              <select
                id="worker-recommendation-select"
                disabled={isSaving}
                value={workerRecommendation}
                onChange={(e) => setWorkerRecommendation(e.target.value as any)}
                className="w-full min-h-[42px] px-3 border border-slate-200 rounded-lg text-xs font-medium bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-700"
              >
                <option value="" disabled>Select a recommendation</option>
                <option value="RETAIN">
                  RETAIN — Beneficiary remains compliant (Asset used for livelihood)
                </option>
                <option value="RECOMMEND_GRADUATION">
                  RECOMMEND_GRADUATION — Beneficiary has achieved SWDI Level 3 Self-Sufficiency
                </option>
                <option value="INVESTIGATE_FRAUD">
                  INVESTIGATE_FRAUD — Material misrepresentation or Sangla-ATM confirmation
                </option>
              </select>
            </div>

            {/* Textarea: narrative_report */}
            <div>
              <label htmlFor="narrative-report-textarea" className="block text-xs font-semibold text-slate-800 mb-1.5">
                Narrative Report <span className="required-label">(required)</span>
              </label>
              <textarea
                id="narrative-report-textarea"
                disabled={isSaving}
                rows={4}
                required
                value={narrativeReport}
                onChange={(e) => setNarrativeReport(e.target.value)}
                placeholder="State qualitative findings from the physical home visit..."
                className="w-full p-3 border border-slate-200 rounded-lg text-xs leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-blue-700 font-sans"
              />
            </div>

            {/* Offline Save Notice */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Device-only draft:</span> This report stays on this device. Server submission is not connected yet.
            </div>

            {/* Primary Action Button: Save & Queue for Sync */}
            <div>
              <button
                id="save-and-queue-sync-btn"
                type="submit"
                disabled={isSaving || !completedSteps.every(Boolean)}
                aria-describedby="assessment-save-status"
                className="w-full min-h-[44px] py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded-lg shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving to Queue...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Report on This Device</span>
                  </>
                )}
              </button>
              <p id="assessment-save-status" className="form-feedback" role="status">
                {isSaving ? 'Saving report...' : completedSteps.every(Boolean) ? 'All required sections complete. Ready to save locally.' : `Incomplete sections: ${steps.filter((step) => !completedSteps[step.num - 1]).map((step) => step.title).join(', ')}.`}
              </p>
              {saveError && <p role="alert" className="form-error">{saveError}</p>}
            </div>

          </form>
        )}

        {/* Stepper Navigation Buttons (Next / Prev) */}
        <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            disabled={currentStep === 1 || isSaving}
            className="min-h-[38px] px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition flex items-center space-x-1 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {currentStep < 5 && (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.min(5, prev + 1))}
              className="min-h-[38px] px-4 py-1.5 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition flex items-center space-x-1 cursor-pointer"
            >
              <span>Next: {steps[currentStep].title}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>

    </div>
  );
};
