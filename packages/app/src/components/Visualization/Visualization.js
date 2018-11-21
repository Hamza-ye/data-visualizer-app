import React, { Component } from 'react';
import { connect } from 'react-redux';
import { createChart } from 'd2-charts-api';
import i18n from '@dhis2/d2-i18n';
import debounce from 'lodash-es/debounce';

import { sGetCurrent } from '../../reducers/current';
import BlankCanvas, { visContainerId } from './BlankCanvas';
import { getOptionsForRequest } from '../../modules/options';
import { acAddMetadata } from '../../actions/metadata';
import {
    sGetUiRightSidebarOpen,
    sGetUiInterpretation,
} from '../../reducers/ui';
import {
    acSetLoadError,
    acSetLoading,
    acClearLoadError,
} from '../../actions/loader';
import { acSetChart } from '../../actions/chart';
import {
    apiFetchAnalytics,
    apiFetchAnalyticsForYearOverYear,
} from '../../api/analytics';
import { isYearOverYear } from '../../modules/chartTypes';
import { sGetVisualization } from '../../reducers/visualization';
import { computeGenericPeriodNames } from '../../modules/analytics';

export class Visualization extends Component {
    recreateChart = Function.prototype;

    addResizeHandler = () => {
        window.addEventListener(
            'resize',
            debounce(() => {
                this.recreateChart();
            }, 300)
        );
    };

    removeCurrentVisualization = id => {
        const container = document.getElementById(id);

        if (container && container.firstChild) {
            container.removeChild(container.firstChild);
        }
    };

    componentDidMount() {
        this.addResizeHandler();

        if (this.props.current) {
            this.renderVisualization(this.props.current);
        }
    }

    componentDidUpdate(prevProps) {
        if (this.props.current !== prevProps.current) {
            this.renderVisualization(this.props.current);
        }

        // avoid redrawing the chart if the interpretation content remains the same
        // this is the case when the panel is toggled but the selected interpretation is not changed
        if (
            prevProps.interpretation &&
            this.props.interpretation.created !==
                prevProps.interpretation.created
        ) {
            const vis = this.props.interpretation.id
                ? this.props.visualization
                : this.props.current;

            this.renderVisualization(vis);
        }

        if (this.props.rightSidebarOpen !== prevProps.rightSidebarOpen) {
            this.recreateChart();
        }
    }

    renderVisualization = async vis => {
        const { interpretation } = this.props;

        const options = getOptionsForRequest().reduce(
            (map, [option, props]) => {
                // only add parameter if value !== default
                if (vis[option] !== props.defaultValue) {
                    map[option] = vis[option];
                }

                return map;
            },
            {}
        );

        if (interpretation && interpretation.created) {
            options.relativePeriodDate = interpretation.created;
        }

        try {
            this.props.acClearLoadError();
            this.props.acSetLoading(true);

            const extraOptions = {};
            let responses = [];

            if (isYearOverYear(vis.type)) {
                let yearlySeriesLabels = [];

                ({
                    responses,
                    yearlySeriesLabels,
                } = await apiFetchAnalyticsForYearOverYear(vis, options));

                extraOptions.yearlySeries = yearlySeriesLabels;

                extraOptions.xAxisLabels = computeGenericPeriodNames(responses);
            } else {
                responses = await apiFetchAnalytics(vis, options);
            }

            responses.forEach(res => {
                this.props.acAddMetadata(res.metaData.items);
            });

            const chartConfig = createChart(
                responses,
                vis,
                visContainerId,
                extraOptions
            );

            this.recreateChart = () => {
                this.removeCurrentVisualization(visContainerId);

                createChart(responses, vis, visContainerId, {
                    ...extraOptions,
                    animation: 0,
                });
            };

            this.props.acSetChart(
                chartConfig.chart.getSVGForExport({
                    sourceHeight: 768,
                    sourceWidth: 1024,
                })
            );

            this.props.acSetLoading(false);
        } catch (error) {
            this.props.acSetLoading(false);
            const errorMessage =
                (error && error.message) ||
                i18n('Error generating chart, please try again');
            this.props.acSetLoadError(errorMessage);
        }
    };

    render() {
        return <BlankCanvas />;
    }
}

const mapStateToProps = state => ({
    current: sGetCurrent(state),
    visualization: sGetVisualization(state),
    interpretation: sGetUiInterpretation(state),
    rightSidebarOpen: sGetUiRightSidebarOpen(state),
});

export default connect(
    mapStateToProps,
    {
        acAddMetadata,
        acSetChart,
        acSetLoadError,
        acSetLoading,
        acClearLoadError,
    }
)(Visualization);
