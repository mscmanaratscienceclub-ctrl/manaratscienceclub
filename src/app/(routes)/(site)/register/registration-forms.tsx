"use client";

import { useState } from "react";
import { AmbassadorProgramSelector } from "./ambassador-program-selector";
import CampusAmbassadorForm from "./campus-ambassador-form";
import VolunteerForm from "./volunteer-form";
import type { AmbassadorType } from "./validate";
import type { RegistrationType } from "./ambassador-program-selector";

export function RegistrationForms() {
  const [selectedType, setSelectedType] = useState<RegistrationType>("campus");

  return (
    <>
      <AmbassadorProgramSelector value={selectedType} onChange={setSelectedType} />
      {selectedType === "volunteer" ? (
        <VolunteerForm />
      ) : (
        <CampusAmbassadorForm type={selectedType satisfies AmbassadorType} />
      )}
    </>
  );
}
