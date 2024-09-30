import React, { Component } from "react";
import Icon, {
  InfoCircleTwoTone,
  CloseCircleTwoTone,
  CheckCircleTwoTone,
  ProfileTwoTone,
  HeartTwoTone,
  LikeTwoTone,
  StarOutlined,
  ClockCircleTwoTone,
  DashboardTwoTone,
} from "@ant-design/icons";
import { Link } from "@reach/router";

import { Card, Tooltip } from "antd";
import "./MapCard.css";
import ModeIcon from "./ModeIcon";

const icons = {
  Pending: InfoCircleTwoTone,
  Rejected: CloseCircleTwoTone,
  Accepted: CheckCircleTwoTone,
  Modded: ProfileTwoTone,
  Nominated: LikeTwoTone,
  Finished: LikeTwoTone,
  Ranked: HeartTwoTone,
};

const colors = {
  Pending: "#aaaaaa",
  Accepted: "#52c41a",
  Modded: "#17bebb",
  Rejected: "#f8333c",
  Ranked: "#eb2f96",
};

export function DiffList({ diffs, tableMode, maxDiffs }) {
  if (diffs.length > maxDiffs) {
    const diffsByMode = {};
    for (const diff of diffs) {
      if (!diffsByMode[diff.mode]) {
        diffsByMode[diff.mode] = [];
      }
      diffsByMode[diff.mode].push(diff);
    }
    return (
      <div className={`MapCard-diff-list ${tableMode ? "table-mode" : ""}`}>
        <div style={{ display: "flex" }}>
          {Object.entries(diffsByMode).map(([mode, diffs]) => {
            if (diffs.length === 1) {
              const diff = diffs[0];
              return (
                <Tooltip key={diff._id} title={`${diff.name} (${diff.sr}☆)`} placement="bottom">
                  <span>
                    <ModeIcon {...diff} />
                  </span>
                </Tooltip>
              );
            }

            // Multiple diffs: show number of diffs and SR spread in the tooltip
            const bottomDiff = diffs[0];
            const topDiff = diffs[diffs.length - 1];
            return (
              <Tooltip
                key={topDiff._id}
                title={`${bottomDiff.sr}☆ - ${topDiff.sr}☆`}
                placement="bottom"
              >
                <span className="MapCard-diff-with-number">
                  <ModeIcon {...topDiff} padding={"7px 3px 7px 7px"} />
                  <span className="MapCard-num-diffs">{diffs.length}</span>
                </span>
              </Tooltip>
            );
          })}
        </div>
      </div>
    );
  }
  return (
    <div className={`MapCard-diff-list ${tableMode ? "table-mode" : ""}`}>
      {diffs.map((diff) => (
        <Tooltip key={diff._id} title={`${diff.name} (${diff.sr}☆)`} placement="bottom">
          <span>
            <ModeIcon {...diff} />
          </span>
        </Tooltip>
      ))}
    </div>
  );
}

export function StatusLabel(props) {
  const StatusIcon = icons[props.status] || InfoCircleTwoTone;
  const lang = window.navigator.userLanguage || window.navigator.language || "en-US";
  return (
    <div>
      <StatusIcon
        twoToneColor={colors[props.status]}
        onClick={() => props.edit && props.edit(props)}
        className="MapCard-status"
      />
      <Tooltip
        title={`Requested ${new Date(props.requestDate).toLocaleDateString(lang)}`}
      >{` ${props.status}`}</Tooltip>
    </div>
  );
}

class MapCard extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  getLink = () =>
    this.props.mapsetId
      ? `https://osu.ppy.sh/s/${this.props.mapsetId}`
      : `https://osu.ppy.sh/b/${this.props.mapId}`;

  render() {
    return (
      <Card
        title={
          <div className="MapCard-title">
            <StatusLabel {...this.props} />
            {this.props.showModType && (
              <div className="MapCard-mod-type">{this.props.m4m ? "M4M" : "NM"}</div>
            )}
          </div>
        }
        bordered={true}
        cover={
          <a className="MapCard-cover" target="_blank" href={this.getLink()}>
            <div className="MapCard-image">
              <img src={this.props.image} />
            </div>
            <div className="MapCard-image-overlay-top">
              <div>
                <div className="MapCard-attr-list">
                  <span className="MapCard-attr">
                    <ClockCircleTwoTone twoToneColor="#fd" /> {this.props.length}
                  </span>
                  <span className="MapCard-attr">
                    <DashboardTwoTone twoToneColor="#fd" /> {this.props.bpm}bpm
                  </span>
                </div>
              </div>
              <DiffList diffs={this.props.diffs} maxDiffs={10} />
            </div>
          </a>
        }
        className="MapCard-card"
      >
        <div className="MapCard-row MapCard-primary">
          <a className="MapCard-link" target="_blank" href={this.getLink()}>
            {this.props.title}
          </a>
        </div>
        <div className="MapCard-row">{this.props.artist}</div>
        {this.props.requester ? (
          <div className="MapCard-row">
            Requested to{" "}
            <a className="MapCard-link" target="_blank" href={`/${this.props.target.username}`}>
              {this.props.target.username}
            </a>
          </div>
        ) : (
          <>
            <div className="MapCard-row">
              Mapset by{" "}
              <a
                className="MapCard-link"
                target="_blank"
                href={`https://osu.ppy.sh/users/${this.props.creator}`}
              >
                {this.props.creator}
              </a>
            </div>
            {this.props.username && this.props.username !== this.props.creator && (
              <div className="MapCard-row">
                Requested by{" "}
                <a
                  className="MapCard-link"
                  target="_blank"
                  href={`https://osu.ppy.sh/users/${this.props.username}`}
                >
                  {this.props.username}
                </a>
              </div>
            )}
          </>
        )}

        {this.props.comment && (
          <>
            <div className="MapCard-divider"></div>
            <div className="MapCard-comment">
              <span className="u-bold">Mapper's Comment: </span>
              {this.props.comment}
            </div>
          </>
        )}

        {this.props.feedback && (
          <>
            <div className="MapCard-divider"></div>
            <div className="MapCard-comment">
              <span className="u-bold">Feedback: </span>
              {this.props.feedback}
            </div>
          </>
        )}
      </Card>
    );
  }
}

export default MapCard;
