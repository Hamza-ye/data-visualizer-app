import React from 'react'

import i18n from '@dhis2/d2-i18n'

import CheckboxBaseOption from './CheckboxBaseOption'

const ParamReportingPeriod = () => (
    <CheckboxBaseOption
        label={i18n.t('Reporting period')}
        option={{
            name: 'reportingPeriod',
        }}
    />
)

export default ParamReportingPeriod
