import React, { Component } from "react";
import ReactMarkdown from "react-markdown";
import "../../utilities.css";
import "./List.css";

// data from "../../content/home-en";
import { Layout, Button, Modal, Input, Form, Select } from "antd";
const { TextArea } = Input;
import { get, post } from "../../utilities";
import MapCard from "../modules/MapCard";
const { Content } = Layout;

class List extends Component {
  constructor(props) {
    super(props);
    this.form = React.createRef();
    this.state = { reqs: [], editing: null };
  }

  async componentDidMount() {
    const reqs = await get("/api/requests");
    this.setState({ reqs });
  }

  edit = (req) => {
    this.setState({ editing: req._id });
    // this is jank, todo fix this
    setTimeout(() => this.form.current.setFieldsValue(req));
  };

  onFinish = async (form) => {
    console.log(form);
    const updated = await post("/api/request-edit", { ...form, id: this.state.editing });
    console.log(updated);
    this.setState({
      editing: null,
      reqs: this.state.reqs.map((req) => (req._id === this.state.editing ? updated : req)),
    });
  };

  render() {
    return (
      <Content className="content">
        <div className="List-container">
          {this.state.reqs.map((req) => (
            <MapCard {...req} admin={this.props.user.admin} edit={this.edit} key={req._id} />
          ))}
        </div>
        <Modal
          title="Manage Request"
          visible={this.state.editing}
          footer={false}
          onCancel={() => this.setState({ editing: null })}
        >
          <Form ref={this.form} onFinish={this.onFinish} name="edit">
            <Form.Item label="Status" name="status">
              <Select>
                <Select.Option value="Pending">Pending</Select.Option>
                <Select.Option value="Rejected">Rejected</Select.Option>
                <Select.Option value="Accepted">Accepted</Select.Option>
                <Select.Option value="Nominated">Nominated</Select.Option>
                <Select.Option value="Ranked">Ranked</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="Feedback" name="feedback">
              <TextArea rows={3} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                Submit
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </Content>
    );
  }
}

export default List;
