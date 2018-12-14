import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { OHIF } from 'ohif-core';
import { Viewerbase } from 'meteor/ohif:viewerbase';
import { StudyBrowser } from 'react-viewerbase';

/**
 * Asynchronous wrapper around Cornerstone's renderToCanvas method.
 *
 * @param {HTMLElement} canvasElement An HTML <canvas> element
 * @param {Image} image A Cornerstone Image
 *
 * @return {Promise} A promise tracking the progress of the rendering. Resolves empty.
 */
function renderAsync(canvasElement, image) {
    return new Promise((resolve, reject) => {
        try {
            cornerstone.renderToCanvas(canvasElement, image);
            resolve();
        } catch(error) {
            reject(error);
        }
    });
}

// Define a handler for success on image load
const loadSuccess = function(image, studyInstanceUid, displaySetInstanceUid) {
    // This is an off-screen canvas. It's used to get dataURL images by using
    // cornerstone.renderToCanvas function.
    const canvasElement = document.createElement('canvas');
    canvasElement.width = 193;
    canvasElement.height = 123;

    // Render the image to canvas to be able to get its dataURL
    renderAsync(canvasElement, image).then(() => {
        const studies = this.state.studiesForBrowser;
        const study = studies.find(study => study.studyInstanceUid === studyInstanceUid);
        const thumbnail = study.thumbnails.find(t => t.displaySetInstanceUid === displaySetInstanceUid);

        thumbnail.imageSrc = canvasElement.toDataURL('image/jpeg', 1);

        this.setState({
            studiesForBrowser: studies
        });
    });
};

// Define a handler for error on image load
const loadError = function(error, studyInstanceUid, displaySetInstanceUid) {
    const studies = this.state.studiesForBrowser;
    const study = studies.find(study => study.studyInstanceUid === studyInstanceUid);
    const thumbnail = study.thumbnails.find(t => t.displaySetInstanceUid === displaySetInstanceUid);

    thumbnail.error = error;

    this.setState({
        studiesForBrowser: studies
    });
};

const ViewerMain = Viewerbase.components.viewer.ViewerMain;

class FlexboxLayout extends Component {
    constructor(props) {
        super(props);

        this.state = {
            leftSidebarOpen: true,
            rightSidebarOpen: false,
            studiesForBrowser: this.getStudiesForBrowser(),
        };

        this.getStudiesForBrowser = this.getStudiesForBrowser.bind(this);
        this.getThumbnailsFromImageIds = this.getThumbnailsFromImageIds.bind(this);
    }

    componentDidMount() {
        this.getThumbnailsFromImageIds();
    }

    getThumbnailsFromImageIds() {
        const studyThumbnails = this.state.studiesForBrowser.forEach(function (study) {
            const { studyInstanceUid } = study;

            study.thumbnails.forEach(function (displaySet) {
                const imageId = displaySet.imageId;
                const {displaySetInstanceUid, seriesDescription, seriesNumber, instanceNumber, numImageFrames} = displaySet;

                cornerstone.loadAndCacheImage(imageId).then((image) => {
                    loadSuccess.call(this, image, studyInstanceUid, displaySetInstanceUid);
                }, error => {
                    loadError.call(this, error, studyInstanceUid, displaySetInstanceUid);
                });
            }, this);
        }, this);

    }

    getStudiesForBrowser() {
        // @TypeSafeStudies
        const studies = OHIF.viewer.Studies.findAllBy({
            selected: true
        });


        // TODO[react]:
        // - Add sorting of display sets
        // - Pass in which display set is active from Redux
        // - Pass in errors and stack loading progress from Redux
        // - Add useMiddleSeriesInstanceAsThumbnail
        // - Add showStackLoadingProgressBar option
        return studies.map((study) => {
            const { studyInstanceUid } = study;

            const thumbnails = study.displaySets.map((displaySet) => {
                const active = false;
                const stackPercentComplete = 0;
                const { displaySetInstanceUid, seriesDescription, seriesNumber, instanceNumber, numImageFrames } = displaySet;
                const imageId = displaySet.images[0].getImageId();
                return {
                    imageSrc: '',
                    imageId,
                    displaySetInstanceUid,
                    seriesDescription,
                    seriesNumber,
                    instanceNumber,
                    numImageFrames,
                    active,
                    stackPercentComplete
                };
            });

            return {
                studyInstanceUid,
                thumbnails
            };
        });
    }

    render() {
        let mainContentClassName = "mainContent"
        if (this.state.leftSidebarOpen) {
            mainContentClassName += ' sidebar-left-open';
        }

        if (this.state.rightSidebarOpen) {
            mainContentClassName += ' sidebar-right-open';
        }

        // TODO[react]: Add measurementLightTable
        return (
            <div className="viewerSection">
                <div className={this.state.leftSidebarOpen ? "sidebarMenu sidebar-left sidebar-open" : "sidebarMenu sidebar-left"}>
                    <StudyBrowser studies={this.state.studiesForBrowser}/>
                </div>
                <div className={mainContentClassName}>
                    <ViewerMain studies={this.props.studies}/>
                </div>
                <div className={this.state.rightSidebarOpen ? "sidebarMenu sidebar-right sidebar-open" : "sidebarMenu sidebar-right"}>
                    {/*{{> measurementLightTable (clone this)}}*/}
                </div>
            </div>
        );
    }
}

FlexboxLayout.propTypes = {
    studies: PropTypes.array.isRequired
};

export default FlexboxLayout;
