import React, { Component } from "react";
import {
  InfoCircleTwoTone,
  CloseCircleTwoTone,
  CheckCircleTwoTone,
  HeartTwoTone,
  LikeTwoTone,
  StarOutlined,
  ClockCircleTwoTone,
  DashboardTwoTone,
} from "@ant-design/icons";
import { Link } from "@reach/router";

import { Card, Popconfirm } from "antd";
import "./MapCard.css";

const icons = {
  Pending: InfoCircleTwoTone,
  Rejected: CloseCircleTwoTone,
  Accepted: CheckCircleTwoTone,
  Nominated: LikeTwoTone,
  Ranked: HeartTwoTone,
};

const colors = {
  Pending: "#aaaaaa",
  Accepted: "#52c41a",
  Rejected: "#f8333c",
  Ranked: "#eb2f96",
};

class MapCard extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    let StatusIcon = icons[this.props.status] || InfoCircleTwoTone;

    return (
      <Card
        title={
          <div className="MapCard-title">
            <div>
              <StatusIcon
                twoToneColor={colors[this.props.status]}
                onClick={() => this.props.edit && this.props.edit(this.props)}
                className="MapCard-status"
              />
              {` ${this.props.status}`}
            </div>
            <div className="MapCard-mod-type">{this.props.m4m ? "M4M" : "NM"}</div>
          </div>
        }
        bordered={true}
        cover={
          <a target="_blank" href={`https://osu.ppy.sh/b/${this.props.mapId}`}>
            <img src={this.props.image} />
          </a>
        }
        className="MapCard-card"
      >
        <div className="MapCard-row MapCard-primary">{this.props.title}</div>
        <div className="MapCard-row">{this.props.artist}</div>
        <div className="MapCard-row">{`Mapset by ${this.props.creator}`}</div>

        <div className="MapCard-divider"></div>
        <div className="MapCard-attr-list">
          <span className="MapCard-attr">
            <ClockCircleTwoTone /> {this.props.length}
          </span>
          <span className="MapCard-attr">
            <DashboardTwoTone /> {this.props.bpm}bpm
          </span>
        </div>

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

        <div className="MapCard-divider"></div>
        <div className="MapCard-diff-list">
          {this.props.diffs.map((diff) => (
            <div key={diff.name} className="MapCard-diff">
              <div className="u-bold">{diff.name}</div>
              <div>
                {diff.sr} <StarOutlined />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }
}

export default MapCard;
