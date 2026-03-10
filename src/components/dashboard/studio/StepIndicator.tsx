import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
  labels: [string, string, string];
}

const StepIndicator = ({ currentStep, labels }: StepIndicatorProps) => {
  return (
    <div className="flex items-center gap-0 mb-6">
      {[1, 2, 3].map((step, i) => (
        <div key={step} className="flex items-center flex-1 last:flex-initial">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                step < currentStep
                  ? 'bg-muted text-muted-foreground'
                  : step === currentStep
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground/50'
              }`}
            >
              {step < currentStep ? <Check className="h-3.5 w-3.5" /> : step}
            </div>
            <span
              className={`text-xs font-medium whitespace-nowrap ${
                step === currentStep ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {labels[i]}
            </span>
          </div>
          {i < 2 && (
            <div className={`flex-1 h-px mx-3 ${step < currentStep ? 'bg-primary/30' : 'bg-border'}`} />
          )}
        </div>
      ))}
    </div>
  );
};

export default StepIndicator;
