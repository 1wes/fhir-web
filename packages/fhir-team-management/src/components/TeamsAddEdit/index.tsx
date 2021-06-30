import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Organization, Practitioner, PractitionerRole } from '../../types';
import Form, { FormField } from './Form';
import { useParams } from 'react-router';
import { PRACTITIONERROLE_GET, PRACTITIONER_GET, TEAMS_GET } from '../../constants';
import { sendErrorNotification } from '@opensrp/notifications';
import { Spin } from 'antd';
import lang from '../../lang';
import FHIR from 'fhirclient';
import { useQuery } from 'react-query';
import { FHIRResponse } from '../../fhirutils';
import { loadTeamDetails } from '../../utils';

export interface Props {
  fhirBaseURL: string;
}

export const TeamsAddEdit: React.FC<Props> = (props: Props) => {
  const { fhirBaseURL } = props;

  const serve = FHIR.client(fhirBaseURL);
  const params: { id?: string } = useParams();
  const [initialValue, setInitialValue] = useState<FormField>();

  const allPractitioner = useQuery(PRACTITIONER_GET, () => serve.request(PRACTITIONER_GET), {
    onError: () => sendErrorNotification(lang.ERROR_OCCURRED),
    select: (res: FHIRResponse<Practitioner>) => res.entry.map((e) => e.resource),
  });

  const team = useQuery([TEAMS_GET, params.id], () => serve.request(`${TEAMS_GET}${params.id}`), {
    onError: () => sendErrorNotification(lang.ERROR_OCCURRED),
    select: (res: Organization) => res,
    enabled: params.id !== undefined,
  });

  const AllRoles = useQuery(PRACTITIONERROLE_GET, () => serve.request(PRACTITIONERROLE_GET), {
    onError: () => sendErrorNotification(lang.ERROR_OCCURRED),
    select: (res: FHIRResponse<PractitionerRole>) => res.entry.map((e) => e.resource),
    enabled: params.id !== undefined,
  });

  if (params.id && team.data && AllRoles.data && !initialValue) {
    loadTeamDetails({
      team: team.data,
      fhirBaseURL: fhirBaseURL,
      AllRoles: AllRoles.data,
    })
      .then((team) => {
        setInitialValue({
          team: team,
          active: team.active,
          name: team.name,
          practitioners: team.practitioners.map((prac) => prac.id),
        });
      })
      .catch(() => sendErrorNotification(lang.ERROR_OCCURRED));
  }

  if (!allPractitioner.data || (params.id && (!initialValue || !AllRoles.data)))
    return <Spin size={'large'} />;

  return (
    <section className="layout-content">
      <Helmet>
        <title>{params.id ? lang.EDIT : lang.CREATE} Team</title>
      </Helmet>

      <h5 className="mb-3 header-title">
        {initialValue?.name ? `${lang.EDIT_TEAM} | ${initialValue.name}` : lang.CREATE_TEAM}
      </h5>

      <div className="bg-white p-5">
        <Form
          fhirbaseURL={fhirBaseURL}
          initialValue={initialValue}
          allPractitioner={allPractitioner.data}
          allPractitionerRole={AllRoles.data ? AllRoles.data : undefined}
        />
      </div>
    </section>
  );
};

export default TeamsAddEdit;
