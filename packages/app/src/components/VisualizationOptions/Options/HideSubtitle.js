import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import i18n from '@dhis2/d2-i18n'
import { Label, Radio, RadioGroup } from '@dhis2/ui-core'

import { VIS_TYPE_PIVOT_TABLE } from '@dhis2/analytics'
import { sGetUiOptions, sGetUiType } from '../../../reducers/ui'
import { acSetUiOptions } from '../../../actions/ui'

import Subtitle from './Subtitle'

import {
    tabSectionOption,
    tabSectionOptionToggleable,
} from '../styles/VisualizationOptions.style.js'

const HIDE_SUBTITLE_AUTO = 'AUTO'
const HIDE_SUBTITLE_NONE = 'NONE'
const HIDE_SUBTITLE_CUSTOM = 'CUSTOM'

class HideSubtitle extends Component {
    constructor(props) {
        super(props)

        this.defaultState = { value: HIDE_SUBTITLE_AUTO }

        this.state = props.value ? { value: props.value } : this.defaultState
    }

    onChange = ({ value }) => {
        this.setState({ value })
        this.props.onChange(
            value === HIDE_SUBTITLE_NONE,
            value === HIDE_SUBTITLE_AUTO
                ? undefined
                : this.props.subtitle || undefined
        )
    }

    render() {
        const { value } = this.state
        const { visualizationType } = this.props

        return (
            <div className={tabSectionOption.className}>
                <Label>
                    {visualizationType === VIS_TYPE_PIVOT_TABLE
                        ? i18n.t('Table subtitle')
                        : i18n.t('Chart subtitle')}
                </Label>
                <RadioGroup
                    name="hideSubtitle-selector"
                    onChange={this.onChange}
                    value={value}
                    dense
                >
                    {[
                        {
                            id: HIDE_SUBTITLE_AUTO,
                            label: i18n.t('Auto generated'),
                        },
                        { id: HIDE_SUBTITLE_NONE, label: i18n.t('None') },
                        { id: HIDE_SUBTITLE_CUSTOM, label: i18n.t('Custom') },
                    ].map(({ id, label }) => (
                        <Radio key={id} label={label} value={id} dense />
                    ))}
                </RadioGroup>
                {value === HIDE_SUBTITLE_CUSTOM ? (
                    <div className={tabSectionOptionToggleable.className}>
                        <Subtitle inline />
                    </div>
                ) : null}
            </div>
        )
    }
}

HideSubtitle.propTypes = {
    subtitle: PropTypes.string,
    value: PropTypes.string,
    visualizationType: PropTypes.string,
    onChange: PropTypes.func,
}

const hideSubtitleSelector = createSelector([sGetUiOptions], uiOptions =>
    uiOptions.hideSubtitle
        ? HIDE_SUBTITLE_NONE
        : uiOptions.subtitle === undefined
        ? HIDE_SUBTITLE_AUTO
        : HIDE_SUBTITLE_CUSTOM
)

const mapStateToProps = state => ({
    visualizationType: sGetUiType(state),
    value: hideSubtitleSelector(state),
    subtitle: sGetUiOptions(state).subtitle,
})

const mapDispatchToProps = dispatch => ({
    onChange: (hideSubtitle, subtitle) =>
        dispatch(acSetUiOptions({ hideSubtitle, subtitle })),
})

export default connect(mapStateToProps, mapDispatchToProps)(HideSubtitle)
