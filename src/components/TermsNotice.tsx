import React from 'react';
import { AlertCircle } from 'lucide-react';

export const TermsNotice: React.FC = () => {
  return (
    <aside
      aria-label="Villkorsinformation"
      className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs sm:text-sm flex items-start gap-3 my-6 shadow-xs"
    >
      <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
      <div>
        <strong className="font-semibold block sm:inline">Villkor och förutsättningar: </strong>
        <span>
          EuroBonus-erbjudanden, poängnivåer och villkor kan ändras. Kontrollera alltid aktuella villkor
          och följ instruktionerna från SAS EuroBonus och respektive butik innan köp.
          Kortpoängen förutsätter att kortet accepteras i betalningsledet och att köpet ger poäng enligt kortets villkor.
        </span>
      </div>
    </aside>
  );
};
