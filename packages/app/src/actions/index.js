import i18n from '@dhis2/d2-i18n'

import {
    apiFetchVisualization,
    apiSaveVisualization,
} from '../api/visualization'

import * as fromVisualization from './visualization'
import * as fromCurrent from './current'
import * as fromDimensions from './dimensions'
import * as fromRecommended from './recommendedIds'
import * as fromUi from './ui'
import * as fromMetadata from './metadata'
import * as fromSettings from './settings'
import * as fromUser from './user'
import * as fromChart from './chart'
import * as fromSnackbar from './snackbar'
import * as fromLoader from './loader'

import { sGetCurrent } from '../reducers/current'
import { sGetVisualization } from '../reducers/visualization'
import { sGetRootOrgUnit, sGetRelativePeriod } from '../reducers/settings'

import history from '../modules/history'
import { getVisualizationFromCurrent } from '../modules/visualization'
import { convertOuLevelsToUids } from '../modules/orgUnit'
import { apiPostDataStatistics } from '../api/dataStatistics'

export {
    fromVisualization,
    fromCurrent,
    fromDimensions,
    fromRecommended,
    fromUi,
    fromMetadata,
    fromSettings,
    fromUser,
    fromChart,
    fromSnackbar,
    fromLoader,
}

export const onError = (action, error) => {
    console.log(`Error in action ${action}: ${error}`)
    return error
}

// visualization, current, ui

export const tDoLoadVisualization = ({
    id,
    interpretationId,
    ouLevels,
}) => async (dispatch, getState, engine) => {
    const onSuccess = async response => {
        dispatch(fromLoader.acSetPluginLoading(true))
        const visualization = convertOuLevelsToUids(
            ouLevels,
            response.visualization
        )

        if (interpretationId) {
            const interpretation = visualization.interpretations.find(
                i => i.id === interpretationId
            )

            if (interpretation) {
                dispatch(fromUi.acSetUiInterpretation(interpretation))
                dispatch(fromUi.acSetUiRightSidebarOpen())
            }
        }

        apiPostDataStatistics(visualization.id)

        dispatch(fromVisualization.acSetVisualization(visualization))
        dispatch(fromCurrent.acSetCurrent(visualization))
        dispatch(fromUi.acSetUiFromVisualization(visualization))
        dispatch(fromLoader.acClearLoadError())
    }

    try {
        return onSuccess(await apiFetchVisualization(engine, id))
    } catch (err) {
        let error = err

        if (err && err.message) {
            error = err.message
        }

        clearVisualization(dispatch, getState, error)

        return onError('tDoLoadVisualization', error)
    }
}

export const clearVisualization = (dispatch, getState, error = null) => {
    if (error) {
        dispatch(fromLoader.acSetLoadError(error))
    } else {
        dispatch(fromLoader.acClearLoadError())
    }

    dispatch(fromVisualization.acClear())
    dispatch(fromCurrent.acClear())

    const rootOrganisationUnit = sGetRootOrgUnit(getState())
    const relativePeriod = sGetRelativePeriod(getState())

    dispatch(fromUi.acClear({ rootOrganisationUnit, relativePeriod }))
}

export const tDoRenameVisualization = ({ name, description }) => (
    dispatch,
    getState
) => {
    const state = getState()

    const visualization = sGetVisualization(state)
    const current = sGetCurrent(state)

    const updatedVisualization = { ...visualization }
    const updatedCurrent = { ...current }

    if (name) {
        updatedVisualization.name = updatedCurrent.name = name
    }

    if (description) {
        updatedVisualization.description = updatedCurrent.description = description
    }

    dispatch(fromVisualization.acSetVisualization(updatedVisualization))

    // keep the same reference for current if there are no changes
    // other than the name/description
    if (visualization === current) {
        dispatch(fromCurrent.acSetCurrent(updatedVisualization))
    } else {
        dispatch(fromCurrent.acSetCurrent(updatedCurrent))
    }

    dispatch(
        fromSnackbar.acReceivedSnackbarMessage({
            message: i18n.t('Rename successful'),
            open: true,
            duration: 2000,
        })
    )
}

export const tDoSaveVisualization = ({ name, description }, copy) => async (
    dispatch,
    getState,
    engine
) => {
    const onSuccess = res => {
        if (res.status === 'OK' && res.response.uid) {
            if (copy) {
                history.push(`/${res.response.uid}`)
            } else {
                history.replace(`/${res.response.uid}`)
            }
        }
    }

    try {
        const visualization = getVisualizationFromCurrent(
            sGetCurrent(getState())
        )

        // remove the id to trigger a POST request and save a new AO
        if (copy) {
            delete visualization.id
        }

        if (name) {
            visualization.name = name
        }

        if (description) {
            visualization.description = description
        }

        return onSuccess(await apiSaveVisualization(engine, visualization))
    } catch (error) {
        return onError('tDoSaveVisualization', error)
    }
}

export const tDoDeleteVisualization = () => (dispatch, getState) => {
    const current = sGetCurrent(getState())

    dispatch(
        fromSnackbar.acReceivedSnackbarMessage({
            message: i18n.t('"{{what}}" successfully deleted.', {
                what: current.name,
            }),
            open: true,
            duration: 2000,
        })
    )

    history.push('/')
}

// snackbar
export const tDoCloseSnackbar = () => dispatch => {
    dispatch(
        fromSnackbar.acReceivedSnackbarMessage({
            open: false,
        })
    )

    // wait for the animation to complete to avoid
    // "flashing" of the snackbar
    setTimeout(() => dispatch(fromSnackbar.acCloseSnackbar()), 250)
}
