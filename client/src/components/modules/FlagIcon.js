import React, { Component } from "react";
import "./FlagIcon.css";

class FlagIcon extends Component {
  render() {
    return (
      <img
        className="FlagIcon-img"
        style={this.props.size ? { height: this.props.size } : {}}
        src={`https://osu.ppy.sh/images/flags/${this.props.code}.png`}
      ></img>
    );
  }
}

export default FlagIcon;
